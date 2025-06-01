// models/Connection.ts
import { Node } from './Node';

export class Connection {
    node1: Node;
    node2: Node;
    text: string;

    constructor(node1: Node, node2: Node, text: string = '') {
        this.node1 = node1;
        this.node2 = node2;
        this.text = text;
    }

    draw(ctx: CanvasRenderingContext2D) {
        const start = { x: this.node1.x, y: this.node1.y };
        const end = { x: this.node2.x, y: this.node2.y };

        // Calculate direction vector
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const ndx = dx / length;
        const ndy = dy / length;

        // Set start and end points on the edge of the circles
        const startX = start.x + ndx * this.node1.size;
        const startY = start.y + ndy * this.node1.size;
        const endX = end.x - ndx * this.node2.size;
        const endY = end.y - ndy * this.node2.size;

        // Draw line
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw text
        if (this.text) {
            const midX = (startX + endX) / 2;
            const midY = (startY + endY) / 2;

            ctx.save();
            ctx.translate(midX, midY);

            let angle = Math.atan2(dy, dx);
            if (angle > Math.PI / 2 || angle < -Math.PI / 2) {
                angle += Math.PI;
            }

            ctx.rotate(angle);

            ctx.fillStyle = '#000';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '10px Arial';

            const textWidth = ctx.measureText(this.text).width;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillRect(-textWidth / 2 - 5, -8, textWidth + 10, 16);

            ctx.fillStyle = '#000';
            ctx.fillText(this.text, 0, 0);

            ctx.restore();
        }
    }
}