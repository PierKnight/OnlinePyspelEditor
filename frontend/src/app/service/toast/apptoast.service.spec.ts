import { TestBed } from '@angular/core/testing';

import { ApptoastService } from './apptoast.service';

describe('ApptoastService', () => {
  let service: ApptoastService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ApptoastService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
