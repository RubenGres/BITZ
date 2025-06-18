import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision';

export class FaceAnonymizer {
  private faceDetector: FaceDetector | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize MediaPipe
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
      );

      this.faceDetector = await FaceDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite`,
          delegate: "CPU"
        },
        runningMode: "IMAGE"
      });

      this.isInitialized = true;
      console.log('MediaPipe Face Detector initialized');
    } catch (error) {
      console.error('Failed to initialize MediaPipe Face Detector:', error);
      throw error;
    }
  }

  async processImageWithFacePixelation(imageData: string): Promise<string> {
    if (!this.faceDetector) {
      throw new Error('Face detector not initialized');
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          // Create canvas for processing
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;
          
          canvas.width = img.width;
          canvas.height = img.height;
          
          // Draw original image
          ctx.drawImage(img, 0, 0);
          
          // Detect faces
          const detections = this.faceDetector!.detect(img);
          
          // Apply pixelation to detected faces
          if (detections.detections && detections.detections.length > 0) {
            detections.detections.forEach(detection => {
              const bbox = detection.boundingBox;
              if (bbox) {
                // Expand bounding box slightly for better coverage
                const padding = 20;
                const x = Math.max(0, bbox.originX - padding);
                const y = Math.max(0, bbox.originY - padding);
                const width = Math.min(canvas.width - x, bbox.width + padding * 2);
                const height = Math.min(canvas.height - y, bbox.height + padding * 2);
                
                const pixelSizeX = Math.max(1, Math.floor(width / 5));
                const pixelSizeY = Math.max(1, Math.floor(height / 5));
                
                // Apply pixelation effect
                this.applyPixelation(ctx, x, y, width, height, pixelSizeX, pixelSizeY);
              }
            });
          }
          
          // Convert back to base64
          const processedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
          resolve(processedDataUrl);
          
        } catch (error) {
          console.error('Error processing image:', error);
          reject(error);
        }
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      img.src = imageData;
    });
  }

  private applyPixelation(
    ctx: CanvasRenderingContext2D, 
    x: number, 
    y: number, 
    width: number, 
    height: number, 
    pixelSizeX: number,
    pixelSizeY: number
  ): void {
    // Get the image data for the face region
    const imageData = ctx.getImageData(x, y, width, height);
    const pixels = imageData.data;
    
    // Create pixelated version with 10x10 grid
    for (let py = 0; py < height; py += pixelSizeY) {
      for (let px = 0; px < width; px += pixelSizeX) {
        // Calculate average color for this pixel block
        let r = 0, g = 0, b = 0, a = 0;
        let count = 0;
        
        // Sample pixels in the current block
        for (let dy = 0; dy < pixelSizeY && py + dy < height; dy++) {
          for (let dx = 0; dx < pixelSizeX && px + dx < width; dx++) {
            const idx = ((py + dy) * width + (px + dx)) * 4;
            r += pixels[idx];
            g += pixels[idx + 1];
            b += pixels[idx + 2];
            a += pixels[idx + 3];
            count++;
          }
        }
        
        // Calculate average colors
        if (count > 0) {
          r = Math.round(r / count);
          g = Math.round(g / count);
          b = Math.round(b / count);
          a = Math.round(a / count);
        }
        
        // Apply the average color to all pixels in this block
        for (let dy = 0; dy < pixelSizeY && py + dy < height; dy++) {
          for (let dx = 0; dx < pixelSizeX && px + dx < width; dx++) {
            const idx = ((py + dy) * width + (px + dx)) * 4;
            pixels[idx] = r;
            pixels[idx + 1] = g;
            pixels[idx + 2] = b;
            pixels[idx + 3] = a;
          }
        }
      }
    }
    
    // Put the pixelated image data back
    ctx.putImageData(imageData, x, y);
  }

  async cleanup(): Promise<void> {
    if (this.faceDetector) {
      this.faceDetector.close();
      this.faceDetector = null;
    }
    this.isInitialized = false;
  }
}