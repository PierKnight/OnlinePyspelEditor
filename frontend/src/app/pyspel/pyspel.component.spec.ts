import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PyspelComponent } from './pyspel.component';

describe('MainComponent', () => {
  let component: PyspelComponent;
  let fixture: ComponentFixture<PyspelComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PyspelComponent]
    });
    fixture = TestBed.createComponent(PyspelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
