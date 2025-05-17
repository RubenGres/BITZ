// models/Node.ts
import { Connection } from './Connection';

export class Node {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    name: string;
    scientificName: string;
    taxonomicGroup: string;
    image: HTMLImageElement | null;
    imageSrc: string;
    connections: Connection[];
    id: string;
    image_filename: string;
    quest_id: string;

    constructor(x: number, y: number, size: number, name: string, scientificName: string, taxonomicGroup: string, imageSrc: string, image_filename: string, quest_id: string) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.size = size;
        this.name = name;
        this.scientificName = scientificName;
        this.taxonomicGroup = taxonomicGroup;
        this.image = null;
        this.imageSrc = imageSrc;
        this.connections = [];
        this.id = Date.now().toString() + Math.random();
        this.image_filename = image_filename;
        this.quest_id = quest_id;

        // Load image
        if (imageSrc) {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = imageSrc;
            img.onload = () => {
                this.image = img;
            };
        }
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        // Damping
        this.vx *= 0.95;
        this.vy *= 0.95;
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);

        if (this.image) {
            // Create circular clipping
            ctx.save();
            ctx.clip();

            // Draw the image
            const imageSize = this.size * 2;
            ctx.drawImage(this.image, this.x - this.size, this.y - this.size, imageSize, imageSize);
            ctx.restore();

            // Draw circle border
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();
        } else {
            // Default appearance
            ctx.fillStyle = '#4caf4f';
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Draw label
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.font = '12px Arial';

        // Background for text
        const textWidth = ctx.measureText(this.name).width;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillRect(this.x - textWidth / 2 - 5, this.y + this.size + 5, textWidth + 10, 15);

        // Draw text
        ctx.fillStyle = '#000';
        ctx.fillText(this.name, this.x, this.y + this.size + 10);
    }

    contains(x: number, y: number): boolean {
        const distance = Math.sqrt((this.x - x) ** 2 + (this.y - y) ** 2);
        return distance <= this.size;
    }
}