import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReportBuilder } from './report-builder';

describe('ReportBuilder', () => {
  let component: ReportBuilder;
  let fixture: ComponentFixture<ReportBuilder>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportBuilder]
    }).compileComponents();

    fixture = TestBed.createComponent(ReportBuilder);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
