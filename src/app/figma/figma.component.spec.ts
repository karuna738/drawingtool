import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FigmaComponent } from './figma.component';

describe('FigmaComponent', () => {
  let component: FigmaComponent;
  let fixture: ComponentFixture<FigmaComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [FigmaComponent]
    });
    fixture = TestBed.createComponent(FigmaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
