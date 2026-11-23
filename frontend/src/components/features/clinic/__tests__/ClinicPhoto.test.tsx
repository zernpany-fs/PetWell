// US-08 AC1 / AC5: the clinic photo shows where there is one,
// and the existing placeholder where there is not.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ClinicPhoto from '../ClinicPhoto';

describe('ClinicPhoto (US-08)', () => {
  it('AC1: shows the photo, named after the clinic', () => {
    render(
      <ClinicPhoto
        photoUrl="https://res.cloudinary.com/demo/clinic.jpg"
        name="Happy Paws"
        className="h-28"
      />,
    );
    const img = screen.getByRole('img', { name: 'Happy Paws' });
    expect(img.getAttribute('src')).toContain(
      encodeURIComponent('https://res.cloudinary.com/demo/clinic.jpg'),
    );
  });

  it('AC5: no photo -> placeholder, no image', () => {
    render(<ClinicPhoto photoUrl={null} name="Happy Paws" className="h-28" />);
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByTestId('clinic-photo-placeholder')).toBeInTheDocument();
  });
});
