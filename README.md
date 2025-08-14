# מערכת התיזמון - Scheduling Application

[![Test API](https://github.com/ygaller/oti-scheduler/actions/workflows/test.yml/badge.svg)](https://github.com/ygaller/oti-scheduler/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?logo=postgresql&logoColor=white)](https://www.postgresql.org/)

מערכת מתקדמת לתיזמון עובדי גן ילדים עם מסד נתונים PostgreSQL משובץ ותמיכה עתידית ב-Electron.

## ✨ תכונות

- **ניהול עובדים**: הוספה, עריכה ומחיקה של עובדים עם הגדרות שעות עבודה מותאמות אישית
- **ניהול חדרי טיפול**: ניהול חדרי הטיפול הזמינים
- **יצירת לוח זמנים אוטומטי**: אלגוריתם חכם ליצירת לוח זמנים תוך התחשבות באילוצים
- **הגדרות מערכת**: קביעת זמני ארוחות ומפגשים
- **איפוס נתונים**: אפשרות לאיפוס מלא של המערכת
- **מסד נתונים משובץ**: PostgreSQL משובץ עם אפשרות חיבור למסד נתונים חיצוני
- **תמיכה עתידית ב-Electron**: ארכיטקטורה מותאמת לפיתוח Electron

## 🏗 ארכיטקטורה

```
Client (React + TypeScript)
        ↕ HTTP API
Server (Express.js + Prisma)
        ↕
Database (Embedded PostgreSQL)
```

### מבנה הפרויקט

```
scheduling/
├── client/          # יישום React
│   ├── src/
│   │   ├── components/   # רכיבי React
│   │   ├── hooks/        # React hooks מותאמים
│   │   ├── services/     # שירותי API
│   │   └── types.ts      # הגדרות TypeScript
├── server/          # שרת API
│   ├── src/
│   │   ├── database/     # הגדרות מסד נתונים
│   │   ├── repositories/ # שכבת גישה לנתונים
│   │   ├── routes/       # נתיבי API
│   │   └── types/        # הגדרות TypeScript
│   └── prisma/           # סכמת מסד נתונים
├── config/          # הגדרות משותפות
└── scripts/         # סקריפטים עזר
```

## 🚀 התקנה והפעלה

### דרישות מוקדמות

- Node.js (גרסה 16 ומעלה)
- npm או yarn

### התקנת תלויות

```bash
# התקנת כל התלויות בפקודה אחת
npm run setup
```

או באופן ידני:

```bash
# התקנת תלויות ברמת הפרויקט
npm install

# התקנת תלויות השרת
cd server && npm install

# התקנת תלויות הלקוח
cd ../client && npm install
```

### הפעלת המערכת

```bash
# הפעלת השרת והלקוח במקביל בפקודה אחת
npm run dev
```

או באופן נפרד:

```bash
# הפעלת השרת בלבד
npm run server:dev

# הפעלת הלקוח בלבד (בטרמינל נפרד)
npm run client:dev
```

### גישה ליישום

- **לקוח (React)**: http://localhost:3000
- **שרת API**: http://localhost:3001
- **בריאות השרת**: http://localhost:3001/api/health

## 🗄 מסד הנתונים

### PostgreSQL משובץ

המערכת משתמשת ב-PostgreSQL משובץ כברירת מחדל. מסד הנתונים מתחיל אוטומטית עם השרת ונשמר בתיקייה מקומית.

### הגדרת מסד נתונים חיצוני

ליצירת קובץ `.env` בתיקיית `server/`:

```env
DB_TYPE=remote
DB_HOST=localhost
DB_PORT=5432
DB_NAME=scheduling
DB_USER=postgres
DB_PASSWORD=postgres
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/scheduling"
```

### טעינת נתונים לדוגמה

```bash
npm run db:seed
```

## 📡 API Endpoints

### עובדים
- `GET /api/employees` - קבלת כל העובדים
- `POST /api/employees` - יצירת עובד חדש
- `PUT /api/employees/:id` - עדכון עובד
- `DELETE /api/employees/:id` - מחיקת עובד

### חדרי טיפול
- `GET /api/rooms` - קבלת כל החדרים
- `POST /api/rooms` - יצירת חדר חדש
- `PUT /api/rooms/:id` - עדכון חדר
- `DELETE /api/rooms/:id` - מחיקת חדר

### לוח זמנים
- `GET /api/schedule/config` - קבלת הגדרות זמנים
- `PUT /api/schedule/config` - עדכון הגדרות זמנים
- `POST /api/schedule/generate` - יצירת לוח זמנים חדש
- `GET /api/schedule/active` - קבלת לוח הזמנים הפעיל

### מערכת
- `GET /api/system/status` - סטטוס המערכת
- `POST /api/system/reset` - איפוס כל הנתונים

## 🖥 תמיכה עתידית ב-Electron

הארכיטקטורה מותאמת לפיתוח Electron עתידי:

- מסד הנתונים יישמר ב-`userData` directory
- שרת API יפעל בתהליך הראשי של Electron
- תקשורת דרך IPC או HTTP מקומי
- קבצי הגדרה מותאמים לסביבת Electron

### הגדרות Electron

משתני סביבה שיוגדרו על ידי Electron:

```env
ELECTRON=true
USER_DATA_PATH=/path/to/electron/userData
```

## 🛠 פיתוח

### בניית הפרויקט

```bash
# בניית כל הפרויקט
npm run build

# בניית השרת בלבד
npm run server:build

# בניית הלקוח בלבד
npm run client:build
```

### בדיקות

```bash
# הרצת בדיקות הלקוח
npm run client:test
```

### עבודה עם מסד הנתונים

```bash
# יצירת migration חדש
cd server && npx prisma migrate dev --name migration_name

# יצירת Prisma client
cd server && npm run db:generate

# פתיחת Prisma Studio
cd server && npm run db:studio
```

## 🔧 הגדרות

### משתני סביבה

קובץ `server/.env`:

```env
# הגדרות מסד נתונים
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/scheduling"
DB_TYPE=embedded
DB_HOST=localhost
DB_PORT=5432
DB_NAME=scheduling
DB_USER=postgres
DB_PASSWORD=postgres

# הגדרות שרת
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# הגדרות Electron
ELECTRON=false
USER_DATA_PATH=
```

## 📋 רישיון

MIT License

---

**הערה**: מערכת זו פותחה עבור גני ילדים בישראל ומותאמת לעברית ולתקני העבודה המקומיים.
