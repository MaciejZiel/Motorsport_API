import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminPageComponent } from './admin-page.component';

describe('AdminPageComponent', () => {
  let fixture: ComponentFixture<AdminPageComponent>;
  let component: AdminPageComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminPageComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('exposes all admin module shortcuts', () => {
    expect(component.links).toHaveLength(6);
    expect(component.links.map((item) => item.label)).toEqual([
      'Users',
      'Teams',
      'Drivers',
      'Seasons',
      'Races',
      'Race Results',
    ]);
  });

  it('renders module summary in template', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('6 modules available.');
  });
});

