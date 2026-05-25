# WasteLink MVP Demo Flow

This is the end-to-end demo flow for the current authenticated MVP.

## 1. Super Admin login

- Open `/login`
- Log in as `SUPER_ADMIN`
- Confirm the admin dashboard loads

## 2. Create City Admin

- Open `/users`
- Create a new `CITY_ADMIN`
- Confirm the user appears in the users list

## 3. City Admin login

- Log out
- Return to `/login`
- Log in as `CITY_ADMIN`
- Confirm admin access still works

## 4. City Admin creates Agent assigned to a collection point

- Open `/users`
- Create an `AGENT`
- Assign a collection point
- Confirm the agent is saved with the selected collection point

## 5. Picker self-registers

- Open `/picker/register`
- Create a new picker account
- Confirm the picker profile and linked user are created

## 6. Picker logs waste

- Open `/picker/dashboard`
- Go to `/picker/log-waste`
- Create a waste log
- Confirm the job appears in `/picker/jobs` as `PENDING`

## 7. Agent logs in

- Open `/login`
- Log in as `AGENT`
- Confirm `/agent/dashboard` loads with the assigned collection point

## 8. Agent verifies assigned collection point job

- Open `/agent/verify`
- Search for the picker job code
- Enter the actual verified kilograms
- Confirm cross-point jobs remain blocked

## 9. Picker sees earnings

- Log back in as the same picker
- Open `/picker/jobs`
- Confirm the job status updates to `VERIFIED` or `PAID`
- Open `/picker/earnings`
- Confirm the earnings entry appears

## 10. Admin dashboard and reports update

- Log in as `SUPER_ADMIN` or `CITY_ADMIN`
- Open the admin dashboard
- Confirm stats update
- Open `/reports`
- Confirm verified kilograms and earnings are reflected

## 11. Super Admin manages users

- Open `/users`
- Confirm `SUPER_ADMIN` can manage all roles
- Confirm `CITY_ADMIN` is limited to `AGENT` and `PICKER`

## Key routes

- `/login`
- `/users`
- `/picker/register`
- `/picker/dashboard`
- `/picker/log-waste`
- `/agent/dashboard`
- `/agent/verify`
- `/reports`