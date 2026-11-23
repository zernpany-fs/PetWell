# PetWell — Clinic Photo

| | |
|---|---|
| **Status** | Draft v1.0 |
| **Date** | 2026-11-23 |
| **Author** | Nopparuth Panyanithiwat |
| **Related** | `PetWell_Password_Reset.md` (D55–D63; numbering continues here), `v2/PetWell_Decision_Log.md` (index of all decisions) |

## 1. Why

`Clinic.photoUrl` existed in the database and the API, but nothing could set it and no page showed it: every clinic had the same placeholder. Owners choosing a clinic had nothing to recognise it by.

## 2. User story

### US-08 — Clinic photo

**As** clinic staff, **I want** to upload a photo of my clinic, **so that** owners can recognise it when they choose where to book.

- **AC1** *Given* I am staff on **Clinic Profile**, *when* I upload an image, *then* it becomes the clinic photo and shows on my Clinic Profile, the owner's clinic list and the clinic detail page. (D64, D65)
- **AC2** *Given* I am staff of clinic A, *when* I try to upload for clinic B, *then* I get `403` and nothing changes. (D64)
- **AC3** *Given* I am an owner, *when* I call the upload endpoint, *then* I get `403`.
- **AC4** *Given* the file is not an image or is over 10 MB, *when* it reaches the API, *then* I get `400` and the photo does not change. (D65)
- **AC5** *Given* a clinic has no photo, *then* every page shows the existing placeholder.
- **AC6** *Given* the database is seeded, *then* each of the 6 demo clinics gets a demo photo only if it has none, so a photo uploaded by staff is never overwritten. (D66)

## 3. Decisions

| ID | Topic | Decision | Reason |
|---|---|---|---|
| D64 | Who can change a clinic photo | Any `CLINIC_STAFF` of that clinic (`user.clinicId` = `:clinicId`), the same rule as editing the clinic profile. A new upload replaces the old photo. No "remove photo" action. The check runs before the upload, so a refused request stores nothing on Cloudinary. | There is no clinic-admin role; staff already edit the clinic's name and address. Removing a photo adds a case nobody asked for. |
| D65 | Upload checks in the API | Every image upload — clinic photo, pet photo, avatar, cover — goes through `ImageFilePipe`: a file must be present, have an `image/*` type and be at most **10 MB** (same limit as the form). Otherwise `400` before Cloudinary is called. Stored as on pets: converted to jpg, at most 1600 px. Health-record attachments are not covered (see Known limits). | Before this, only the form checked files; a non-image sent straight to the API reached Cloudinary and came back as a `500`. |
| D66 | Demo photos | The seed sets `photoUrl` for the 6 demo clinics to photos hot-linked from Unsplash (`images.unsplash.com`, free under the Unsplash License), **only when `photoUrl` is null**. `images.unsplash.com` is allowed in `next.config.ts`. Photos with a real business name, logo or phone number were not used. | Gives the live demo real-looking clinics without the build depending on Cloudinary. "Only when null" keeps staff uploads across redeploys. Real branding on a fictional clinic would look like impersonation. |
| D67 | Demo clinic names (2026-11-23) | Each seeded clinic's name starts with the login that runs it, e.g. `(vet1) โรงพยาบาลสัตว์รักษ์เพื่อน`. The seed finds an existing clinic through its staff account (then by name), and renames it **once**, only while it still has the old seed name; a name changed by staff is left alone. | Demo visitors can see which login belongs to which clinic. Looking clinics up by name alone would have created 6 duplicate clinics on the next deploy after a rename. |

## 4. Changes

| Area | Change |
|---|---|
| Backend | `PATCH /clinics/:clinicId/photo` (`CLINIC_STAFF`, field `photo`); `ClinicService.uploadPhoto`; `ImageFilePipe` (`src/common/pipes`) on the clinic, pet, avatar and cover uploads; seed backfills demo photos |
| Frontend | `ClinicPhoto` (photo or placeholder) on the owner clinic list, clinic detail and staff Clinic Profile; `ClinicPhotoUpload` (**Change photo**) on Clinic Profile; `uploadClinicPhotoAction`; `images.unsplash.com` in `next.config.ts` |
| Database | No migration (`clinics.photo_url` already existed) |

## 5. Verification (2026-11-23)

- **Backend (Vitest)**: 6 unit tests for `ImageFilePipe` (image passes, exactly 10 MB passes; no file, text, PDF, over 10 MB → 400) and 4 integration tests on `petwell_test` (own clinic set, replace, other clinic → 403 with nothing uploaded, unknown clinic → 404). Full suite 130/130.
- **Frontend (Vitest)**: 5 component tests (photo shown with the clinic name, placeholder without one; upload sends `photo` and refreshes, non-image refused before upload, API error shown). Full suite 40/40.
- **Deliberate bugs**: no ownership check, a 1 GB size limit, and always showing the placeholder each made tests fail.
- **Over HTTP (local backend)**: owner → 403; vet2 on vet1's clinic → 403; text file → 400; no file → 400; text file to pet photo, avatar and cover → 400 (was 500).
- **Seed**: first run added photos to the 6 clinics; second run changed nothing. D67: on the dev database the first run renamed the 6 clinics and the second changed nothing; on an empty database the first run created 6 clinics and the second created none.
- **By hand, in the browser (localhost)**: vet1 → Clinic Profile shows the photo and **Change photo** → upload replaces it; owner → clinic list and detail show the photos.
- API scripts 27/27 and 35/35; `next build` passes.

## 6. Known limits

- Replaced photos stay on Cloudinary (same as pet photos).
- On the live demo, Vercel limits a request body to about 4.5 MB, so larger images fail there before reaching the 10 MB check.
- Health-record attachments (`POST /health-records/:recordId/attachments`) still have no file check in the API.
- Demo photos depend on Unsplash keeping the image URLs.

## 7. Out of scope

- Removing a clinic photo
- Several photos per clinic (gallery)
- Cleaning up replaced files on Cloudinary
