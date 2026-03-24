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

  snap(v: number) {
    return Math.round(v / this.gridSize) * this.gridSize;
  }

  pos(e: MouseEvent) {
    const r = this.canvasRef.nativeElement.getBoundingClientRect();
    const x = this.snap(e.clientX - r.left);
    const y = this.snap(e.clientY - r.top);
    return { x, y };
  }

  // ================= DOWN =================
  down(e: MouseEvent) {
    const { x, y } = this.pos(e);
    const shape = this.hit(x, y);

    if (this.mode === 'text') {
      const text = prompt('Enter text');
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

    this.shapes.forEach((s) => {
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

        const boxWidth = textWidth + padding * 2;
        const boxHeight = 20;

        const boxX = s.x - padding;
        const boxY = s.y - 14;

        // 🔥 BACKGROUND COLOR
        this.ctx.fillStyle = s.color === '#000000' ? '#3498db' : s.color;
        this.ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

        // 🔥 BORDER
        this.ctx.strokeStyle = '#000';
        this.ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

        // 🔥 TEXT ALWAYS BLACK
        this.ctx.fillStyle = '#000000';
        this.ctx.fillText(text, s.x, s.y);
      }

      if (this.selected.includes(s)) {
        this.ctx.strokeStyle = 'blue';
        this.ctx.strokeRect(s.x - 5, s.y - 5, 110, 30);
      }
    });
  }

  // ================= LAYERS =================
  selectFromLayer(s: Shape) {
    this.selected = [s];
    this.draw();
  }

  deleteShape(s: Shape) {
    this.shapes = this.shapes.filter((x) => x.id !== s.id);
    this.saveState();
    this.draw();
  }

  addDataloggers() {
    const count = Number(prompt('Enter number of dataloggers'));

    if (!count || count <= 0) return;

    const startX = 50;
    const startY = 50;

    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);

    const gap = 60;

    let index = 1;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (index > count) break;

        const x = this.snap(startX + c * gap);
        const y = this.snap(startY + r * gap);

        this.shapes.push({
          id: Date.now() + index,
          type: 'logger',
          x,
          y,
          color: this.color, // 🔥 background color
          text: `DL-${index}`,
        });

        index++;
      }
    }

    this.saveState();
    this.draw();
  }

  // ================= TEXT =================
editText(e: MouseEvent) {
  const { x, y } = this.pos(e);
  const s = this.hit(x, y);

  // 🔥 FIX: allow both text + logger
  if (s && (s.type === 'text')) {

    const t = prompt('Edit', s.text);

    if (t !== null) {
      s.text = t;
      this.saveState();
      this.draw();
    }
  }
}

  // ================= HIT =================
hit(x: number, y: number): Shape | null {
  return [...this.shapes].reverse().find((s) => {

    // 🔥 LOGGER (FIRST PRIORITY)
    if (s.type === 'logger') {
      const text = s.text || '';
      const textWidth = this.ctx.measureText(text).width;
      const padding = 6;

      const boxWidth = textWidth + padding * 2;
      const boxHeight = 20;

      const boxX = s.x - padding;
      const boxY = s.y - 14;

      return (
        x >= boxX &&
        x <= boxX + boxWidth &&
        y >= boxY &&
        y <= boxY + boxHeight
      );
    }

    // 🔥 TEXT
    if (s.type === 'text') {
      return (
        x >= s.x &&
        x <= s.x + 100 &&
        y >= s.y - 20 &&
        y <= s.y + 10
      );
    }

    // 🔥 LINE (LAST PRIORITY + STRICT CHECK)
    if (s.type === 'line' && s.points) {
      const [p1, p2] = s.points;

      const dist =
        Math.abs(
          (p2.y - p1.y) * x -
          (p2.x - p1.x) * y +
          p2.x * p1.y -
          p2.y * p1.x
        ) / Math.hypot(p2.y - p1.y, p2.x - p1.x);

      return dist < 4; // 🔥 reduce sensitivity
    }

    return false;

  }) || null;
}

  // ================= UNDO =================
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
