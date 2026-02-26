import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Landing } from './landing';
import { Router } from '@angular/router';

describe('Landing', () => {
  let component: Landing;
  let fixture: ComponentFixture<Landing>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [Landing],
      providers: [
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Landing);
    component = fixture.componentInstance;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
