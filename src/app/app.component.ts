import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements AfterViewInit {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  ctx!: CanvasRenderingContext2D;

  drawing = false;
  startX = 0;
  startY = 0;

  gridSize = 25;

  mode: 'draw' | 'erase' | 'marker' = 'draw';

  markerColor = '#ff0000';

  history: string[] = [];

  ngAfterViewInit() {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;

    this.saveState();

    canvas.addEventListener('mousedown', (e) => this.startDraw(e));
    canvas.addEventListener('mousemove', (e) => this.onMove(e));
    canvas.addEventListener('mouseup', () => this.endDraw());
    canvas.addEventListener('mouseleave', () => this.endDraw());
  }

  setMode(mode: 'draw' | 'erase' | 'marker') {
    this.mode = mode;
  }

  snap(value: number) {
    return Math.round(value / this.gridSize) * this.gridSize;
  }

  startDraw(e: MouseEvent) {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();

    const x = this.snap(e.clientX - rect.left);
    const y = this.snap(e.clientY - rect.top);

    // MARKER MODE
    // if (this.mode === 'marker') {
    //   const label = prompt('Enter datalogger name');

    //   this.ctx.beginPath();
    //   this.ctx.arc(x, y, 8, 0, Math.PI * 2);
    //   this.ctx.fillStyle = this.markerColor;
    //   this.ctx.fill();

    //   this.ctx.fillStyle = '#000';
    //   this.ctx.font = '14px Arial';
    //   this.ctx.fillText(label || '', x + 10, y - 10);

    //   this.saveState();

    //   return;
    // }

    if (this.mode === 'marker') {
      const label = prompt('Enter datalogger name');

      const width = 40;
      const height = 15;

      // draw rectangle
      this.ctx.fillStyle = this.markerColor;
      this.ctx.fillRect(x - width / 2, y - height / 2, width, height);

      this.ctx.strokeStyle = '#000';
      this.ctx.strokeRect(x - width / 2, y - height / 2, width, height);

      // draw text inside rectangle
      this.ctx.fillStyle = '#fff';
      this.ctx.font = '10px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';

      this.ctx.fillText(label || 'DL', x, y);

      this.saveState();

      return;
    }

    this.startX = x;
    this.startY = y;

    this.drawing = true;
  }

  onMove(e: MouseEvent) {
    if (!this.drawing) return;

    const rect = this.canvasRef.nativeElement.getBoundingClientRect();

    const x = this.snap(e.clientX - rect.left);
    const y = this.snap(e.clientY - rect.top);

    // ERASER MODE
    if (this.mode === 'erase') {
      this.ctx.clearRect(x - 10, y - 10, 20, 20);
      return;
    }

    // DRAW MODE
    this.ctx.beginPath();
    this.ctx.moveTo(this.startX, this.startY);
    this.ctx.lineTo(x, y);
    this.ctx.strokeStyle = '#2c3e50';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    this.startX = x;
    this.startY = y;
  }

  endDraw() {
    if (this.drawing) {
      this.drawing = false;
      this.saveState();
    }
  }

  saveState() {
    const canvas = this.canvasRef.nativeElement;
    this.history.push(canvas.toDataURL());
  }

  undo() {
    if (this.history.length <= 1) return;

    this.history.pop();

    const canvas = this.canvasRef.nativeElement;

    const img = new Image();
    img.src = this.history[this.history.length - 1];

    img.onload = () => {
      this.ctx.clearRect(0, 0, canvas.width, canvas.height);
      this.ctx.drawImage(img, 0, 0);
    };
  }

  clearCanvas() {
    const canvas = this.canvasRef.nativeElement;

    this.ctx.clearRect(0, 0, canvas.width, canvas.height);

    this.saveState();
  }
}
