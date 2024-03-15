import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimeOffComponent } from './time-off.component';

describe('TimeOffComponent', () => {
  let component: TimeOffComponent;
  let fixture: ComponentFixture<TimeOffComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TimeOffComponent]
    });
    fixture = TestBed.createComponent(TimeOffComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
