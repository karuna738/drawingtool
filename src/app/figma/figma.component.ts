import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';

interface Shape {
  id: number;
  type: 'text' | 'line' | 'logger';
  x: number;
  y: number;
  color: string;
  text?: string;
  points?: { x: number; y: number }[];
}

@Component({
  selector: 'app-figma',
  templateUrl: './figma.component.html',
  styleUrls: ['./figma.component.scss'],
})
export class FigmaComponent implements AfterViewInit {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  ctx!: CanvasRenderingContext2D;

  shapes: Shape[] = [];
  selected: Shape[] = [];

  mode: 'select' | 'text' | 'line' = 'select';
  color = '#000000';

  dragging = false;

  drawingLine = false;
  lineStart: { x: number; y: number } | null = null;

  history: string[] = [];
  redoStack: string[] = [];

  gridSize = 25;

  ngAfterViewInit() {
    const canvas = this.canvasRef.nativeElement;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    this.ctx = canvas.getContext('2d')!;

    canvas.addEventListener('mousedown', (e) => this.down(e));
    canvas.addEventListener('mousemove', (e) => this.move(e));
    canvas.addEventListener('mouseup', (e) => this.up(e));
    canvas.addEventListener('dblclick', (e) => this.editText(e));

    this.saveState();
    this.draw();
  }

  // ================= GRID =================
  drawGrid() {
    const canvas = this.canvasRef.nativeElement;
    const step = this.gridSize;

    this.ctx.strokeStyle = '#e0e0e0';
    this.ctx.fillStyle = '#888';
    this.ctx.font = '10px Arial';

    // Vertical lines + X scale
    for (let x = 0; x < canvas.width; x += step) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, canvas.height);
      this.ctx.stroke();

      this.ctx.fillText(x.toString(), x + 2, 10);
    }

    // Horizontal lines + Y scale
    for (let y = 0; y < canvas.height; y += step) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(canvas.width, y);
      this.ctx.stroke();

      this.ctx.fillText(y.toString(), 2, y - 2);
    }
  }

  snap(v: number) {
    return Math.round(v / this.gridSize) * this.gridSize;
  }

  pos(e: MouseEvent) {
    const r = this.canvasRef.nativeElement.getBoundingClientRect();
    return {
      x: this.snap(e.clientX - r.left),
      y: this.snap(e.clientY - r.top),
    };
  }

  // ================= DOWN =================
  down(e: MouseEvent) {
    const { x, y } = this.pos(e);
    const shape = this.hit(x, y);

    if (this.mode === 'text') {
      const text = prompt('Enter text');
      if(['',null,undefined].includes(text)) return;
      this.shapes.push({
        id: Date.now(),
        type: 'text',
        x,
        y,
        color: this.color,
        text: text || '',
      });
      this.saveState();
      this.draw();
      return;
    }

    if (this.mode === 'line') {
      this.drawingLine = true;
      this.lineStart = { x, y };
      return;
    }

    if (shape) {
      this.selected = [shape];
      this.dragging = true;
    } else {
      this.selected = [];
    }

    this.draw();
  }

  // ================= MOVE =================
  move(e: MouseEvent) {
    const { x, y } = this.pos(e);

    if (this.drawingLine && this.lineStart) {
      this.draw();

      this.ctx.beginPath();
      this.ctx.moveTo(this.lineStart.x, this.lineStart.y);
      this.ctx.lineTo(x, y);
      this.ctx.strokeStyle = this.color;
      this.ctx.stroke();
      return;
    }

    if (!this.dragging) return;

    this.selected.forEach((s) => {
      s.x = x;
      s.y = y;
    });

    this.draw();
  }

  // ================= UP =================
  up(e: MouseEvent) {
    const { x, y } = this.pos(e);

    if (this.drawingLine && this.lineStart) {
      this.shapes.push({
        id: Date.now(),
        type: 'line',
        x: this.lineStart.x,
        y: this.lineStart.y,
        color: this.color,
        points: [this.lineStart, { x, y }],
      });

      this.drawingLine = false;
      this.lineStart = null;

      this.saveState();
      this.draw();
    }

    if (this.dragging) this.saveState();
    this.dragging = false;
  }

  // ================= DRAW =================
  draw() {
    const c = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, c.width, c.height);

    // 🔥 GRID
    this.drawGrid();

    this.ctx.font = '12px Arial';

    this.shapes.forEach((s) => {
      console.log('draw',s)
      if (s.type === 'text') {
        this.ctx.fillStyle = s.color;
        this.ctx.fillText(s.text!, s.x, s.y);
      }

      if (s.type === 'line') {
        this.ctx.beginPath();
        this.ctx.moveTo(s.points![0].x, s.points![0].y);
        this.ctx.lineTo(s.points![1].x, s.points![1].y);
        this.ctx.strokeStyle = s.color;
        this.ctx.stroke();
      }

      if (s.type === 'logger') {
        const text = s.text || '';

        const textWidth = this.ctx.measureText(text).width;
        const padding = 6;

        const boxX = s.x - padding;
        const boxY = s.y - 14;

        // this.ctx.fillStyle = s.color === '#000000' ? '#3498db' : s.color;
        this.ctx.fillStyle = this.isBlackCategory(s.color)
          ? '#3498db'
          : s.color;
        this.ctx.fillRect(boxX, boxY, textWidth + padding * 2, 20);

        this.ctx.strokeStyle = '#000';
        this.ctx.strokeRect(boxX, boxY, textWidth + padding * 2, 20);

        this.ctx.fillStyle = '#000';
        this.ctx.fillText(text, s.x, s.y);
      }

      if (this.selected.includes(s)) {
        this.ctx.strokeStyle = 'blue';
        this.ctx.strokeRect(s.x - 10, s.y - 20, 80, 30);
      }
    });
  }

  isBlackCategory(color: string): boolean {
    if (!color) return false;

    let r = 0,
      g = 0,
      b = 0;

    // HEX
    if (color.startsWith('#')) {
      let hex = color.replace('#', '');

      if (hex.length === 3) {
        hex = hex
          .split('')
          .map((c) => c + c)
          .join('');
      }

      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
    }

    // RGB / RGBA
    else if (color.startsWith('rgb')) {
      const values = color.match(/\d+/g);
      if (values) {
        r = +values[0];
        g = +values[1];
        b = +values[2];
      }
    }

    // fallback for named color
    else if (color.toLowerCase() === 'black') {
      return true;
    }

    // 🔥 brightness calculation
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;

    return brightness < 80; // 👈 threshold for “black category”
  }

  // ================= HIT =================
  hit(x: number, y: number): Shape | null {
    return (
      [...this.shapes].reverse().find((s) => {
        if (s.type === 'logger') {
          const textWidth = this.ctx.measureText(s.text || '').width;
          const padding = 6;

          return (
            x >= s.x - padding &&
            x <= s.x + textWidth + padding &&
            y >= s.y - 14 &&
            y <= s.y + 6
          );
        }

        if (s.type === 'text') {
          return x >= s.x && x <= s.x + 100 && y >= s.y - 20 && y <= s.y + 10;
        }

        if (s.type === 'line' && s.points) {
          const [p1, p2] = s.points;

          const dist =
            Math.abs(
              (p2.y - p1.y) * x - (p2.x - p1.x) * y + p2.x * p1.y - p2.y * p1.x,
            ) / Math.hypot(p2.y - p1.y, p2.x - p1.x);

          return dist < 4;
        }

        return false;
      }) || null
    );
  }

  // ================= ADD LOGGER =================
  addDataloggers() {
    const count = Number(prompt('Enter number of dataloggers'));
    if (!count) return;

    const gap = 60;

    // 🔥 get current max DL number
    const max = this.shapes
      .filter((s) => s.type === 'logger')
      .map((s) => Number(s.text?.split('-')[1]))
      .filter((n) => !isNaN(n));

    let index = max.length ? Math.max(...max) + 1 : 1;

    const startIndex = index;

    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (index >= startIndex + count) break;

        this.shapes.push({
          id: Date.now() + index,
          type: 'logger',
          x: this.snap(50 + c * gap),
          y: this.snap(50 + r * gap),
          color: this.color,
          text: `DL-${index}`,
        });

        index++;
      }
    }

    this.saveState();
    this.draw();
  }

  // ================= EDIT =================
  editText(e: MouseEvent) {
    const { x, y } = this.pos(e);
    const s = this.hit(x, y);

    if (s && s.type === 'text') {
      const t = prompt('Edit', s.text);
      if (t !== null) {
        s.text = t;
        this.saveState();
        this.draw();
      }
    }
  }

  // ================= UTILS =================
  selectFromLayer(s: Shape) {
    console.log('selectFromLayer',s)
    this.selected = [s];
    this.draw();
  }

  deleteShape(s: Shape) {
    this.shapes = this.shapes.filter((x) => x.id !== s.id);
    this.saveState();
    this.draw();
  }

  saveState() {
    this.history.push(JSON.stringify({ shapes: this.shapes }));
    this.redoStack = [];
  }

  undo() {
    if (this.history.length <= 1) return;
    this.redoStack.push(this.history.pop()!);
    this.shapes = JSON.parse(this.history[this.history.length - 1]).shapes;
    this.draw();
  }

  redo() {
    if (!this.redoStack.length) return;
    const s = JSON.parse(this.redoStack.pop()!);
    this.shapes = s.shapes;
    this.history.push(JSON.stringify(s));
    this.draw();
  }

  save() {
    localStorage.setItem('figma', JSON.stringify({ shapes: this.shapes }));
  }

  load() {
    const d = localStorage.getItem('figma');
    if (!d) return;
    this.shapes = JSON.parse(d).shapes;
    this.draw();
  }

  clearAll() {
    if (!confirm('Clear?')) return;
    this.shapes = [];
    this.history = [];
    this.redoStack = [];
    this.saveState();
    this.draw();
  }
}
