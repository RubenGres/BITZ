from openai import OpenAI
import json
import os
import base64
import re
from typing import Dict, List, Optional, Union
from oaak_classify import identify_chatgpt

class ImageAnalyzer:
    def __init__(self, api_key: Optional[str] = None):
        """Initialize the ImageAnalyzer with an optional API key."""
        self.client = OpenAI(api_key=api_key or os.getenv('OPENAI_API_KEY'))
        self.conversation_history = []
        self.system_prompts = self._load_system_prompts()

    def _load_system_prompts(self) -> dict:
        import os
        prompts = {}
        
        # Get all .txt files in the prompts/analyze directory
        prompt_dir = "prompts/analyze"
        for filename in os.listdir(prompt_dir):
            if filename.endswith(".txt"):
                filepath = os.path.join(prompt_dir, filename)
                # Remove the .txt extension to use as key
                key = os.path.splitext(filename)[0]
                
                # Read the file content
                with open(filepath, 'r') as file:
                    prompts[key] = file.read()
        
        return prompts

    def _extract_json_from_text(self, text: str) -> Dict:
        """
        Extract a JSON object from text that might contain additional content.
        Handles cases where the model might add comments or explanations.
        """
        # Find content that looks like a JSON object (between curly braces)
        json_match = re.search(r'(\{.*\})', text, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except json.JSONDecodeError:
                pass
                
        # If that fails, try a more flexible approach
        try:
            # Try to find the start and end of the JSON object
            start_idx = text.find('{')
            if start_idx != -1:
                # Find matching closing brace
                open_braces = 0
                for i in range(start_idx, len(text)):
                    if text[i] == '{':
                        open_braces += 1
                    elif text[i] == '}':
                        open_braces -= 1
                        if open_braces == 0:
                            end_idx = i + 1
                            try:
                                return json.loads(text[start_idx:end_idx])
                            except:
                                pass
        except:
            pass
            
        # If all extraction attempts fail, create a default structure with the raw text
        return self._create_fallback_response(text)
    
    def _create_fallback_response(self, text: str) -> Dict:
        """Create a fallback response when JSON parsing fails."""
        return {
            "species_identification": {
                "name": "Unknown Species",
                "what_is_it": "The system detected something in the image.",
                "ecological_importance": "Ecological importance could not be determined automatically.",
                "species_interactions": [
                    "Further analysis needed to determine interactions."
                ]
            },
            "sampling_guidance": {
                "question": "Would you like to try again with a better image?",
                "yes_action": "Take a clearer photo with better lighting.",
                "no_action": "Look for a different subject to photograph instead."
            },
            "next_target": {
                "focus": "Try to find something with distinctive features.",
                "location": "Look in well-lit areas for clearer subjects.",
                "importance": "Clear images help with accurate identification and ecological assessment."
            },
            "raw_response": text[:500] + ("..." if len(text) > 500 else "")
        }

    def analyze_image(self, image_input: Union[str, dict], flavor: str, history) -> Dict:
        """
        Analyze an image using OpenAI's model for biodiversity sampling.
        This is a two step process, first the species identification and then the full analysis text.
        The image can be provided as a local file path or a URL.
        
        Args:
            image_input: Either a local file path (str) or a dict containing image URL
                        Format for URL: {"type": "image_url", "image_url": {"url": "https://..."}}
            flavor: The flavor of the analysis
        
        Returns:
            Dict containing the biodiversity analysis results
        """

        # default flavor to "basic" if not found
        flavor = "basic" if flavor not in self.system_prompts else flavor

        def get_species_name(entry):
            try:
                data = entry['assistant']
                if isinstance(data, str):
                    data = json.loads(data)
                return data.get('species_identification', {}).get('name', '')
            except:
                return ''

        species_names = [name for name in map(get_species_name, history) if name]

        print("species_names are:", species_names)

        try:
            language = "en"  # Default language, adjust as needed
            species_csv_lines = identify_chatgpt(image_input, language)

            messages = [
                {
                    "role": "system",
                    "content": self.system_prompts[flavor]
                }
            ]

            # Add conversation history for context
            messages.extend(self.conversation_history)

            # Add the current image
            messages.append({
                "role": "user",
                "content": f"Here are the species found on the image: \n\n {species_csv_lines}. Previous species identified: {', '.join(species_names)}",
            })

            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                max_tokens=2048,
                response_format={"type": "json_object"}  # Request JSON formatting
            )
            
            response_content = response.choices[0].message.content
            
            try:
                result = json.loads(response_content)
                
                if not all(key in result for key in ["species_identification", "sampling_guidance", "next_target"]):
                    result = self._extract_json_from_text(response_content)
                
                self.conversation_history.append({
                    "role": "assistant",
                    "content": json.dumps(result)  # Store the parsed result to ensure valid JSON in history
                })
                return result
                
            except json.JSONDecodeError:
                # Try to extract JSON from the response
                result = self._extract_json_from_text(response_content)
                self.conversation_history.append({
                    "role": "assistant",
                    "content": json.dumps(result)  # Store the parsed result
                })
                return result

        except Exception as e:
            return {
                "error": f"Analysis failed: {str(e)}",
                "species_identification": {
                    "name": "Error Occurred",
                    "what_is_it": "An error occurred during processing.",
                    "ecological_importance": "Unable to analyze at this time.",
                    "species_interactions": ["Error processing image."]
                },
                "sampling_guidance": {
                    "question": "Would you like to try again?",
                    "yes_action": "Take a clearer photo with better lighting.",
                    "no_action": "Try a different subject."
                },
                "next_target": {
                    "focus": "Look for clearly visible subjects.",
                    "location": "Areas with good lighting and minimal obstructions.",
                    "importance": "Clear images allow for better identification and analysis."
                }
            }

    def process_user_response(self, answer: str) -> Dict:
        """
        Process a user's response and provide next steps for sampling.
        
        Args:
            answer: The user's response to the current question
            
        Returns:
            Dict containing the next sampling guidance
        """
        try:
            # Add user's response to conversation history
            self.conversation_history.append({
                "role": "user",
                "content": f"My observation: {answer}"
            })

            messages = [
                {
                    "role": "system", 
                    "content": self.system_prompts["default"]
                }
            ]
            
            # Add conversation history
            messages.extend(self.conversation_history)

            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                max_tokens=1024,
                response_format={"type": "json_object"}  # Request JSON formatting
            )
            
            response_content = response.choices[0].message.content
            
            try:
                # Try direct parsing
                result = json.loads(response_content)
                
                # Validate expected structure
                if not all(key in result for key in ["species_identification", "sampling_guidance", "next_target"]):
                    result = self._extract_json_from_text(response_content)
                
                # Add to conversation history
                self.conversation_history.append({
                    "role": "assistant",
                    "content": json.dumps(result)
                })
                return result
                
            except json.JSONDecodeError:
                result = self._extract_json_from_text(response_content)
                self.conversation_history.append({
                    "role": "assistant",
                    "content": json.dumps(result)
                })
                return result

        except Exception as e:
            return self._create_fallback_response(f"Failed to process response: {str(e)}")
