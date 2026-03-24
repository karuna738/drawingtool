import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';

@Component({
  selector: 'app-pint',
  templateUrl: './pint.component.html',
  styleUrls: ['./pint.component.scss']
})
export class PintComponent implements AfterViewInit {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  ctx!: CanvasRenderingContext2D;

  drawing = false;

  startX = 0;
  startY = 0;

  warehouseStartX = 0;
  warehouseStartY = 0;

  gridSize = 25;

  mode: 'draw' | 'marker' | 'warehouse' = 'draw';

  markerColor = '#ff0000';

  history: string[] = [];
  redoStack: string[] = [];

  SCALE_SIZE = 25; // 🔥 important

  ngAfterViewInit() {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;

    this.drawScale();
    this.saveState();

    canvas.addEventListener('mousedown', (e) => this.startDraw(e));
    canvas.addEventListener('mousemove', (e) => this.onMove(e));
    canvas.addEventListener('mouseup', () => this.endDraw());
    canvas.addEventListener('mouseleave', () => this.endDraw());
  }

  setMode(mode: 'draw' | 'marker' | 'warehouse') {
    this.mode = mode;
  }

  snap(value: number) {
    return Math.round(value / this.gridSize) * this.gridSize;
  }

  // =========================
  // SCALE
  // =========================
  drawScale() {
    const canvas = this.canvasRef.nativeElement;
    const width = canvas.width;
    const height = canvas.height;

    const step = this.gridSize;

    this.ctx.save();

    this.ctx.strokeStyle = '#bdc3c7';
    this.ctx.fillStyle = '#7f8c8d';
    this.ctx.font = '10px Arial';

    // X axis
    for (let x = 0; x <= width; x += step) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, 8);
      this.ctx.stroke();

      if (x % 100 === 0) {
        this.ctx.fillText(x.toString(), x + 2, 18);
      }
    }

    // Y axis
    for (let y = 0; y <= height; y += step) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(8, y);
      this.ctx.stroke();

      if (y % 100 === 0) {
        this.ctx.fillText(y.toString(), 10, y + 3);
      }
    }

    this.ctx.restore();
  }

  // =========================
  // REMOVE SCALE BEFORE SAVE 🔥
  // =========================
  getCanvasWithoutScale(): string {
    const canvas = this.canvasRef.nativeElement;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;

    const tempCtx = tempCanvas.getContext('2d')!;

    tempCtx.drawImage(canvas, 0, 0);

    // ❗ remove scale areas
    tempCtx.clearRect(0, 0, canvas.width, this.SCALE_SIZE);
    tempCtx.clearRect(0, 0, this.SCALE_SIZE, canvas.height);

    return tempCanvas.toDataURL();
  }

  // =========================
  // START DRAW
  // =========================
  startDraw(e: MouseEvent) {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();

    const x = this.snap(e.clientX - rect.left);
    const y = this.snap(e.clientY - rect.top);

    if (this.mode === 'marker') {
      this.drawSingleMarker(x, y);
      this.saveState();
      return;
    }

    if (this.mode === 'warehouse') {
      this.warehouseStartX = x;
      this.warehouseStartY = y;
      this.drawing = true;
      return;
    }

    this.startX = x;
    this.startY = y;
    this.drawing = true;
  }

  // =========================
  // MOVE
  // =========================
  onMove(e: MouseEvent) {
    if (!this.drawing) return;

    const rect = this.canvasRef.nativeElement.getBoundingClientRect();

    const x = this.snap(e.clientX - rect.left);
    const y = this.snap(e.clientY - rect.top);

    if (this.mode === 'warehouse') {
      this.redrawFromState(this.history[this.history.length - 1]);

      const width = x - this.warehouseStartX;
      const height = y - this.warehouseStartY;

      this.ctx.strokeStyle = '#2980b9';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(
        this.warehouseStartX,
        this.warehouseStartY,
        width,
        height
      );
      return;
    }

    this.ctx.beginPath();
    this.ctx.moveTo(this.startX, this.startY);
    this.ctx.lineTo(x, y);
    this.ctx.strokeStyle = '#2c3e50';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    this.startX = x;
    this.startY = y;
  }

  // =========================
  // END DRAW
  // =========================
  endDraw() {
    if (!this.drawing) return;

    this.drawing = false;

    if (this.mode === 'warehouse') {
      const rows = Number(prompt('Enter rows'));
      const cols = Number(prompt('Enter columns'));

      if (!rows || !cols) return;

      this.generateGrid(this.warehouseStartX, this.warehouseStartY, rows, cols);
    }

    this.saveState();
  }

  // =========================
  // MARKER
  // =========================
  drawSingleMarker(x: number, y: number) {
    const label = prompt('Enter datalogger name');
    this.drawDatalogger(x, y, label || 'DL');
  }

  // =========================
  // GRID
  // =========================
  generateGrid(startX: number, startY: number, rows: number, cols: number) {
    const cellWidth = 50;
    const cellHeight = 30;
    const padding = 10;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = startX + c * (cellWidth + padding);
        const y = startY + r * (cellHeight + padding);

        this.drawDatalogger(x, y, `DL-${r + 1}-${c + 1}`);
      }
    }
  }

  // =========================
  // DRAW BOX
  // =========================
  drawDatalogger(x: number, y: number, label: string) {
    this.ctx.fillStyle = this.markerColor;
    this.ctx.fillRect(x, y, 40, 15);

    this.ctx.strokeStyle = '#000';
    this.ctx.strokeRect(x, y, 40, 15);

    this.ctx.fillStyle = '#fff';
    this.ctx.fillText(label, x + 20, y + 8);
  }

  // =========================
  // SAVE STATE (FIXED)
  // =========================
  saveState() {
    this.history.push(this.getCanvasWithoutScale());
    this.redoStack = [];
  }

  // =========================
  // REDRAW
  // =========================
  redrawFromState(state: string) {
    const canvas = this.canvasRef.nativeElement;

    const img = new Image();
    img.src = state;

    img.onload = () => {
      this.ctx.clearRect(0, 0, canvas.width, canvas.height);
      this.ctx.drawImage(img, 0, 0);

      this.drawScale(); // ✅ only once
    };
  }

  // =========================
  // UNDO
  // =========================
  undo() {
    if (this.history.length <= 1) return;

    const last = this.history.pop();
    this.redoStack.push(last!);

    this.redrawFromState(this.history[this.history.length - 1]);
  }

  // =========================
  // REDO
  // =========================
  redo() {
    if (!this.redoStack.length) return;

    const state = this.redoStack.pop()!;
    this.history.push(state);

    this.redrawFromState(state);
  }

  // =========================
  // CLEAR
  // =========================
  clearCanvas() {
    const canvas = this.canvasRef.nativeElement;

    this.ctx.clearRect(0, 0, canvas.width, canvas.height);

    this.drawScale();
    this.saveState();
  }
}
