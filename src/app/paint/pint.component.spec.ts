import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PintComponent } from './pint.component';

describe('PintComponent', () => {
  let component: PintComponent;
  let fixture: ComponentFixture<PintComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PintComponent]
    });
    fixture = TestBed.createComponent(PintComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
