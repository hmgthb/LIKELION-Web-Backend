# LIKELION Web Backend

Backend API server for the LIKELION club homepage.
Built with Express + TypeScript, using Firebase authentication and Supabase (PostgreSQL) database.

**Frontend:** [likelion-web-frontend](https://likelion-web-frontend.vercel.app)

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Runtime | Node.js |
| Framework | Express 5 |
| Language | TypeScript |
| Database | Supabase (PostgreSQL) |
| Authentication | Firebase Admin SDK |
| File Storage | Supabase Storage |
| Deployment | Vercel |

---

## Project Structure

```
src/
├── index.ts                              # Server entry point, router registration
├── firebase/
│   ├── firebase.ts                       # Firebase Admin initialization
│   └── verifyFirebaseToken.ts            # Firebase token verification middleware
├── lib/
│   └── supabase.ts                       # Supabase client configuration
└── routes/
    ├── projects.ts                       # Project management API
    ├── admins.ts                         # Admin member retrieval API
    ├── photos.ts                         # Photo upload/management API
    ├── signup.ts                         # User signup API
    ├── login.ts                          # User login API
    ├── attendance.ts                     # Attendance check-in API
    ├── qr-create.ts                      # QR session creation API
    ├── events.ts                         # Events management API
    ├── adminpage-manage_members.ts       # Admin - member management API
    ├── adminpage-save_manage_members.ts  # Admin - bulk member save API
    ├── adminpage-attendance_list.ts      # Admin - attendance list API
    └── adminpage-admin-cards.ts          # Admin - admin cards management API
```

---

## Getting Started

### Environment Variables

Create a `.env` file in the project root with the following variables:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
PORT=3000
FIREBASE_WEB_API_KEY=your_firebase_web_api_key
FIREBASE_SERVICE_ACCOUNT={"type":"service_account", ...}  # JSON string
```

### Installation & Running

```bash
# Install dependencies
npm install

# Run development server (with Hot Reload)
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

The development server runs at `http://localhost:3000`.

---

## API Reference

All endpoints use the `/api` prefix.

### Authentication

#### `POST /api/user/signup` — Register a new user

```json
{
  "school_email": "user@university.edu",
  "password": "password123",
  "korean_name": "홍길동",
  "english_name": "Hong Gildong",
  "graduate_year": 2025,
  "current_university": "Korea University",
  "team": "Web"
}
```

- `school_email`: must end with `.edu`
- `korean_name`: Korean characters only, max 10 chars
- `english_name`: letters only, capitalized, max 50 chars
- `password`: min 6 chars, no spaces
- Creates both a Firebase Auth account and a Supabase Members record

#### `POST /api/login` — Login

```json
{
  "school_email": "user@university.edu",
  "password": "password123"
}
```

Response: `{ idToken, localId, user }`
Use the `idToken` in subsequent requests as `Authorization: Bearer <idToken>`.

---

### Projects

#### `GET /api/retrieve-all-projects` — Get all projects

Returns all projects with their linked photos and members.

#### `POST /api/projects` — Create a project

```json
{
  "project_name": "Project Name",
  "start_date": "2024-03-01",
  "end_date": "2024-12-31",
  "description": "Description",
  "github_link": "https://github.com/...",
  "tech_stack": ["React", "Node.js"],
  "team_name": "Web",
  "status": "in_progress",
  "member_ids": [1, 2, 3]
}
```

`status`: `planning` | `in_progress` | `completed`

#### `PATCH /api/projects/:id` — Update a project

Partial updates are supported. Passing `member_ids` replaces all existing member links.

#### `DELETE /api/projects/:id` — Delete a project

Cascades to linked member and photo records.

---

### Admin Members

#### `GET /api/retrieve-all-admin` — Get all admin members

Returns members where `is_admin = true`, with linked photos.

---

### Photos

#### `GET /api/retrieve-all-photos` — Get all photos

Returns all photos linked to members and projects. Each photo includes a `source: 'member' | 'project'` field.

#### `POST /api/photos/upload` — Upload a photo

Send as `multipart/form-data`.

| Field | Required | Description |
|-------|----------|-------------|
| `file` | Yes | Image file to upload |
| `date` | | Photo date |
| `description` | | Caption |
| `member_id` | | Uploader member ID |
| `linked_member_id` | | Member to link the photo to |
| `linked_project_id` | | Project to link the photo to |

#### `PUT /api/photos/update` — Update photo metadata

```json
{
  "photo_id": 1,
  "description": "New caption",
  "link_id": 1,
  "linked_member_id": 2
}
```

#### `DELETE /api/photos/delete` — Delete a photo

```json
{
  "photo_id": 1,
  "link_id": 1,
  "project_id": 1
}
```

Removes the photo from link tables, the Photos table, and Supabase Storage.

---

### Attendance

#### `GET /api/qr-create?meeting_number={number}` — Create a QR session

Creates an attendance session valid for **10 minutes**.

Response: `{ qr_id, qr_url, meeting_number, created_at, expires_at }`

#### `POST /api/attendance` — Check in

```json
{
  "school_email": "user@university.edu",
  "password": "password123",
  "meeting_number": 1
}
```

- Within session window: status `Present`
- After session expires: status `Late`
- Duplicate check-in returns `409`

---

### Events

#### `GET /api/events?start=YYYY-MM-DD&end=YYYY-MM-DD` — Get events

Optional `start` and `end` query parameters for date range filtering. Returns all events if not specified.

#### `POST /api/events` — Create an event

```json
{
  "event_title": "Event Name",
  "category": "Category",
  "start_date": "2024-09-01",
  "end_date": "2024-09-01",
  "location": "Location",
  "description": "Description",
  "is_public": true
}
```

---

### Admin Page

> Admin-only APIs.

#### `GET /api/adminpage/members_list` — Get all members

#### `PUT /api/adminpage/members_edit/:member_id` — Edit a member

Partial updates are supported.

#### `DELETE /api/adminpage/members_delete/:member_id` — Delete a member

#### `POST /api/adminpage/save_manage_members` — Bulk update/delete members

```json
{
  "updates": [{ "member_id": 1, "team": "Web" }],
  "deletes": [2, 3]
}
```

Also deletes the corresponding Firebase Auth accounts for deleted members.

#### `GET /api/adminpage/attendance_list?meeting_number={number}` — Get attendance list

Returns attendance records for all active members (`is_active = true`). Members with no record are shown as `Absent`. Omit `meeting_number` to return all meetings.

#### `POST /api/adminpage/attendance_status` — Update attendance status

```json
{
  "member_id": 1,
  "meeting_number": 1,
  "status": "Present"
}
```

`status`: `Present` | `Late` | `Absent`. Creates a new record if one does not exist.

---

### Admin Cards

#### `GET /api/admin-cards` — Get all admin cards (public)

Public endpoint for the landing page. Ordered by `display_order` ascending.

Response fields: `id`, `member_id`, `position`, `display_name`, `description`, `display_order`

#### `POST /api/adminpage/admin-cards` — Create an admin card

```json
{
  "position": "President",
  "display_name": "Hong Gildong",
  "description": "Hello!",
  "member_id": 1,
  "display_order": 1
}
```

Returns `409` if `display_order` is already taken.

#### `PUT /api/adminpage/admin-cards/:id` — Update an admin card

#### `DELETE /api/adminpage/admin-cards/:id` — Delete an admin card

---

## Database Schema

```
Members                    Projects                   Photos
─────────────────────      ─────────────────────      ─────────────────────
member_id (PK)             project_id (PK)            photo_id (PK)
school_email (unique)      project_name               photo_url
korean_name                start_date                 date
english_name               end_date                   description
graduate_year              description                member_id (FK)
current_university         github_link
team                       tech_stack[]
is_admin                   team_name
is_undergraduate           status
is_mentor
is_graduated               Attendance_Session         Events
is_active                  ─────────────────────      ─────────────────────
                           qr_id (PK)                 event_id (PK)
Project_Member_Link        meeting_number             event_title
─────────────────────      created_at                 category
project_id (FK)            expires_at                 start_date
member_id (FK)                                        end_date
                           Attendance                 location
Project_Photo_Link         ─────────────────────      description
─────────────────────      member_id (FK)             created_by (FK)
project_id (FK)            meeting_number             is_public
photo_id (FK)              status
                           timestamp                  Admin_Cards
Members_Photos                                        ─────────────────────
─────────────────────                                 id (PK)
member_id (FK)                                        member_id (FK)
photo_id (FK)                                         position
                                                      display_name
                                                      description
                                                      display_order (unique)
```

---

## Authentication Flow

```
Client                       Backend                    Firebase
  │                             │                           │
  │── POST /api/login ─────────▶│                           │
  │                             │── Firebase REST API ─────▶│
  │                             │◀── idToken ───────────────│
  │◀── { idToken, user } ───────│                           │
  │                             │                           │
  │── Request + Bearer Token ──▶│                           │
  │                             │── verifyIdToken ─────────▶│
  │                             │◀── decoded user ──────────│
  │◀── Response ────────────────│                           │
```

---

## Deployment

- **Platform:** Vercel (Node.js Runtime)
- **Config:** `vercel.json`
- CORS is restricted to `https://likelion-web-frontend.vercel.app`
- The `SUPABASE_SERVICE_ROLE_KEY` is server-side only — never expose it to the client
