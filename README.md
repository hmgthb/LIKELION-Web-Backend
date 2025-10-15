# 📦 Supabase + Express + TypeScript API 서버

이 프로젝트는 **Supabase 데이터베이스**를 기반으로 한  
간단한 **Express + TypeScript 백엔드 서버**입니다.

---

## 🚀 주요 기능

- `/api/retrieve-all-projects`  
  → 모든 프로젝트 및 프로젝트 사진 조회

- `/api/retrieve-all-admin`  
  → 관리자(`is_admin = true`)인 멤버와 해당 멤버 사진 조회

- `/api/retrieve-all-photos`  
  → 모든 멤버 및 프로젝트 사진 통합 조회

---

## 🛠️ 기술 스택

- **Node.js / Express**
- **TypeScript**
- **Supabase** (PostgreSQL + Storage)
- **dotenv** 환경 변수 관리

---

## ⚙️ 설치 및 실행 방법

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정
`.env` 파일을 생성하고 아래 내용을 추가하세요:

```
SUPABASE_URL=YOUR_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
PORT=3000
```

### 3. 개발 서버 실행
```bash
npm run dev
```

서버가 실행되면:  
👉 http://localhost:3000/api/retrieve-all-projects  
에서 API를 테스트할 수 있습니다.

---

## 📁 프로젝트 구조

```
src/
 ├─ index.ts              # 서버 엔트리 포인트
 ├─ lib/
 │   └─ supabase.ts       # Supabase 클라이언트 설정
 └─ routes/
     ├─ projects.ts       # 프로젝트 관련 API
     ├─ admins.ts         # 관리자 관련 API
     └─ photos.ts         # 사진 관련 API
```

---

## 🧑‍💻 개발자 참고

- Supabase의 테이블 이름 및 관계(FK)는 실제 DB 스키마에 맞게 수정하세요.  
- 서버 키(Service Role Key)는 **절대 클라이언트 코드에 노출하지 마세요.**

---

## 🪪 라이선스

이 프로젝트는 개인 학습 및 포트폴리오용으로 자유롭게 수정/활용 가능합니다.
