// US-08 AC1 / AC4 in the form: staff pick an image of their clinic.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import ClinicPhotoUpload from '../ClinicPhotoUpload';
import { uploadClinicPhotoAction } from '@/lib/actions/clinic.action';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/actions/clinic.action', () => ({
  uploadClinicPhotoAction: vi.fn(),
}));
const upload = vi.mocked(uploadClinicPhotoAction);

function pick(file: File) {
  const user = userEvent.setup({ applyAccept: false });
  return user.upload(screen.getByTestId('clinic-photo-input'), file);
}

describe('ClinicPhotoUpload (US-08)', () => {
  beforeEach(() => {
    upload.mockReset();
    refresh.mockReset();
    vi.mocked(toast.error).mockReset();
  });

  it('AC1: sends the image as "photo" for this clinic, then refreshes', async () => {
    upload.mockResolvedValue({ success: true, message: 'Photo updated.' });
    render(<ClinicPhotoUpload clinicId="clinic-1" />);

    await pick(new File(['x'], 'clinic.jpg', { type: 'image/jpeg' }));

    expect(upload).toHaveBeenCalledTimes(1);
    const [clinicId, formData] = upload.mock.calls[0];
    expect(clinicId).toBe('clinic-1');
    expect((formData as FormData).get('photo')).toBeInstanceOf(File);
    expect(refresh).toHaveBeenCalled();
  });

  it('AC4: a non-image is refused before upload', async () => {
    render(<ClinicPhotoUpload clinicId="clinic-1" />);

    await pick(new File(['x'], 'notes.txt', { type: 'text/plain' }));

    expect(upload).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('Please choose an image file.');
  });

  it('shows the API message when the upload fails', async () => {
    upload.mockResolvedValue({
      success: false,
      message: 'You can only edit your own clinic',
      code: 'API_ERROR',
    });
    render(<ClinicPhotoUpload clinicId="clinic-1" />);

    await pick(new File(['x'], 'clinic.jpg', { type: 'image/jpeg' }));

    expect(toast.error).toHaveBeenCalledWith(
      'You can only edit your own clinic',
    );
    expect(refresh).not.toHaveBeenCalled();
  });
});
