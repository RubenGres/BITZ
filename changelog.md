 # BITZ
 Feature list

## FRONTED
- [ ] Domain
- [ ] Home
- [ ] Project information
    - [ ] About
    - [ ] How to make a quest
    - [ ] How to run a custom project
- [ ] Design quest (flavour maker) - (v2)
    - [ ] Define space/location
    - [ ] Change prompt
    - [ ] Setup team
    - [ ] Custom url
- [ ] Start quest
    - [ ] Accept data publication
    - [ ] Different user gets different tasks/flavours?
        - [ ] Slow flow
        - [ ] Data harvesting
        - [ ] With printed field-guide
    - [ ] User stop quest
    - [ ] End quest notification
- [ ] Ended quest
    - [ ] Raw data = DwC
        - [ ] Table with images
    - [ ] Quest brief / interpretation
        - [ ] Species relationships
- [ ] Archive
    - [ ] Global quest’s map?
    - [ ] List of places wher quests happened?
        - [ ] Each place opens a table?
        - [ ] Each place opens a place in the map?
    - [ ] Relationship browser?

## BACKEND
 - [ ] Place influences the LLM
     - [ ] iNat retrieval
     - [ ] Existing knowledge as RAG?
     - [ ] Place as text to LLM
 - [ ] flavour : text Instructions define LLM behaviour 
     - [ ] N flavours defined
 - [ ] LLM detects species in photos
     - [ ] Discard non relevant images 
     - [ ] Split photos in quadrants for better detection?
 - [ ] Species detections are stored (csv)
     - [ ] Image, scientific name, date, place, 
         - [ ] Common name can be retrieved afterwards
         - [ ] Official image (from botanical sources) can be retrieved afterwards
 - [ ] Based on detection, LLM suggests new action
     - [ ] User input: images
     - [ ] User input: tap
     - [ ] User input: text / audio (if stuck?)
 - [ ] Quest completed after N actions, time or completeness
 - [ ] A table per quest
 - [ ] A table per place
 - [ ] Quest added to the global map
 - [ ] Embeddings
     - [ ] Images + LLM response pairs are computed

 - [ ] DATASET
 - [ ] Project quests compose a specific location Dataset
 - [ ] Individual quests contribute to a local / regional / national dataset
 - [ ] Images: permanently stored 
 - [ ] DarwinCore pushed to GitHub/others
     - [ ] Dataset published to GBIF
