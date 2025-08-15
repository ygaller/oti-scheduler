# מערכת התיזמון - Scheduling Application

[![Test API](https://github.com/ygaller/oti-scheduler/actions/workflows/test.yml/badge.svg)](https://github.com/ygaller/oti-scheduler/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Electron](https://img.shields.io/badge/Electron-2B2E3A?logo=electron&logoColor=9FEAF9)](https://www.electronjs.org/)
[![Cross-Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS-blue)](https://github.com/ygaller/oti-scheduler)

מערכת מתקדמת לתיזמון עובדי גן ילדים עם מסד נתונים PostgreSQL משובץ. זמינה כיישום ווב וכיישום שולחן עבודה (Electron).

## ✨ תכונות

- **ניהול עובדים**: הוספה, עריכה ומחיקה של עובדים עם הגדרות שעות עבודה מותאמות אישית
- **ניהול מטופלים**: הוספה, עריכה ומחיקה של מטופלים עם דרישות טיפול מותאמות וקידוד צבעים
- **ניהול חדרי טיפול**: ניהול חדרי הטיפול הזמינים
- **ניהול פעילויות**: הגדרת חסימות זמן וחלונות זמן אסורים לתיזמון
- **יצירת לוח זמנים אוטומטי**: אלגוריתם חכם ליצירת לוח זמנים תוך התחשבות באילוצים ופעילויות
- **הגדרות מערכת**: קביעת זמני ארוחות ומפגשים
- **איפוס נתונים**: אפשרות לאיפוס מלא של המערכת
- **מסד נתונים משובץ**: PostgreSQL משובץ עם אפשרות חיבור למסד נתונים חיצוני
- **יישום שולחן עבודה**: אפליקציה עצמאית ב-Electron עבור Windows ו-macOS
- **הפצה צולבת פלטפורמה**: חבילות התקנה מוכנות עבור פלטפורמות שונות

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
│   │   ├── utils/        # כלים עזר וייצוא נתונים
│   │   └── types.ts      # הגדרות TypeScript
├── server/          # שרת API
│   ├── src/
│   │   ├── database/     # הגדרות מסד נתונים
│   │   ├── repositories/ # שכבת גישה לנתונים
│   │   ├── routes/       # נתיבי API
│   │   ├── types/        # הגדרות TypeScript
│   │   └── utils/        # כלים עזר ותיקוף
│   ├── tests/            # בדיקות API מקיפות
│   └── prisma/           # סכמת מסד נתונים
├── electron/        # יישום שולחן עבודה
│   ├── main.js           # תהליך ראשי של Electron
│   ├── preload.js        # סקריפט preload עבור אבטחה
│   ├── server.js         # ניהול שרת משובץ
│   └── icons/            # איקונים עבור האפליקציה
├── config/          # הגדרות משותפות
└── scripts/         # סקריפטים עזר וביטוח
```

## 🚀 התקנה והפעלה

### דרישות מוקדמות

- Node.js (גרסה 18 ומעלה)
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

#### במצב PostgreSQL משובץ (מומלץ)

המערכת מגיעה עם PostgreSQL משובץ כברירת מחדל - אין צורך בהתקנה נוספת של מסד נתונים:

```bash
# הפעלת השרת והלקוח במקביל עם PostgreSQL משובץ
npm run dev
```

או באופן נפרד:

```bash
# הפעלת השרת עם PostgreSQL משובץ
npm run server:dev

# הפעלת הלקוח בלבד (בטרמינל נפרד)
npm run client:dev
```

**דרישות למצב משובץ:**
- PostgreSQL מותקן במערכת (בדרך כלל באמצעות brew ב-macOS או apt/yum ב-Linux)
- הפורט נקבע דינמית על ידי המערכת
- נתונים נשמרים בתיקייה מקומית

**התקנת PostgreSQL:**
```bash
# macOS
brew install postgresql

# Ubuntu/Debian
sudo apt install postgresql

# CentOS/RHEL
sudo yum install postgresql
```

### גישה ליישום

- **לקוח (React)**: http://localhost:3000
- **שרת API**: http://localhost:3001
- **בריאות השרת**: http://localhost:3001/api/health

## 🖥 יישום שולחן עבודה (Electron)

### פיתוח יישום שולחן עבודה

```bash
# הפעלה במצב פיתוח (משיק שרת, לקוח ו-Electron)
npm run electron:dev
```

### בניית חבילות התקנה

```bash
# הכנה לבנייה
npm run prepare:electron

# בנייה עבור macOS
npm run dist:mac

# בנייה עבור Windows
npm run dist:win

# בנייה עבור שתי הפלטפורמות
npm run dist:all
```

### תכונות יישום שולחן העבודה

- **עצמאי לחלוטין**: כולל מסד נתונים משובץ, ללא צורך בהתקנות נוספות
- **תמיכה צולבת פלטפורמה**: Windows (x64) ו-macOS (Intel + Apple Silicon)
- **התקנה פשוטה**: קבצי DMG ו-EXE מוכנים להפצה
- **אבטחה**: הפרדת תהליכים ו-IPC מאובטח
- **ביצועים**: ממשק משתמש מקורי עם אפליקציה מלאה

### קבצים מיוצרים

#### macOS
- `oti-scheduler-1.0.0.dmg` (Intel x64)
- `oti-scheduler-1.0.0-arm64.dmg` (Apple Silicon)

#### Windows
- `oti-scheduler Setup 1.0.0.exe`

### דרישות לבנייה

**עבור macOS:**
- macOS (למימוש קוד signing)
- Xcode Command Line Tools

**עבור Windows:**
- Windows (מומלץ) או הגדרת cross-compilation

לפרטים נוספים, ראה [ELECTRON.md](./ELECTRON.md)

## 🗄 מסד הנתונים

### PostgreSQL משובץ (ברירת מחדל)

המערכת משתמשת ב-PostgreSQL משובץ כברירת מחדל. מסד הנתונים:
- מתחיל אוטומטית עם השרת על פורט זמין
- נשמר בתיקייה מקומית (למשל: `~/.oti-scheduler/data`)
- כולל ניהול אוטומטי של migrations
- מספק יציבות וביצועים טובים
- **אין צורך בהגדרת קבצי .env למצב זה**

#### הפעלה במצב משובץ

```bash
# פשוט הפעל את המערכת - PostgreSQL יתחיל אוטומטית
npm run dev
```

או:

```bash
# יצירת קובץ .env בתיקיית server/ (אופציונלי)
cd server
cp env.example .env
```

הקובץ `server/env.example` כבר מוגדר למצב משובץ:
```env
DB_TYPE=embedded  # זה המצב כברירת מחדל
```

### מסד נתונים חיצוני

במידה ואתה רוצה להשתמש במסד נתונים PostgreSQL חיצוני, צור קובץ `.env` בתיקיית `server/`:

```env
DB_TYPE=remote
DB_HOST=localhost
DB_PORT=5432
DB_NAME=scheduling
DB_USER=postgres
DB_PASSWORD=postgres
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/scheduling"
```

**הערה**: במצב משובץ, הפורט נקבע דינמית ולא ניתן להגדירו מראש.

### טעינת נתונים לדוגמה

```bash
npm run server:db:seed
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

### מטופלים
- `GET /api/patients` - קבלת כל המטופלים
- `POST /api/patients` - יצירת מטופל חדש
- `PUT /api/patients/:id` - עדכון מטופל
- `DELETE /api/patients/:id` - מחיקת מטופל

### פעילויות וחסימות זמן
- `GET /api/activities` - קבלת כל הפעילויות
- `POST /api/activities` - יצירת פעילות חדשה
- `PUT /api/activities/:id` - עדכון פעילות
- `DELETE /api/activities/:id` - מחיקת פעילות

### לוח זמנים
- `POST /api/schedule/generate` - יצירת לוח זמנים חדש
- `GET /api/schedule/active` - קבלת לוח הזמנים הפעיל
- `GET /api/schedule/all` - קבלת כל לוחות הזמנים
- `PUT /api/schedule/:id/activate` - הפעלת לוח זמנים ספציפי

### מערכת
- `GET /api/system/status` - סטטוס המערכת
- `POST /api/system/reset` - איפוס כל הנתונים
- `GET /api/health` - בדיקת בריאות השרת

## 📱 הפצה ומיתוג

### שם המוצר
היישום נקרא **oti-scheduler** ומותג כ"OTI Scheduler" בכל הפלטפורמות.

### פורמטי הפצה
- **macOS**: DMG installers עם תמיכה אוניברסלית (Intel + Apple Silicon)
- **Windows**: NSIS installer עם shortcuts אוטומטיים
- **Web**: יישום React זמין בדפדפן

### מסלולי פיתוח
- **פיתוח מקומי**: `npm run dev` או `npm run electron:dev`
- **staging**: בנייה מקומית למטרות בדיקה
- **production**: CI/CD pipeline עם הפצה אוטומטית

## 🛠 פיתוח

### בניית הפרויקט

```bash
# בניית כל הפרויקט (ווב)
npm run build

# בניית השרת בלבד
npm run server:build

# בניית הלקוח בלבד
npm run client:build

# הכנה ובנייה עבור Electron
npm run prepare:electron
npm run electron:pack
```

### בדיקות

#### בדיקות הלקוח
```bash
# הרצת בדיקות הלקוח
npm run client:test
```

#### בדיקות השרת
```bash
# הרצת כל בדיקות השרת
cd server && npm test

# הרצה במצב watch
cd server && npm run test:watch

# בדיקות עם כיסוי קוד
cd server && npm run test:coverage

# בדיקות עבור CI
cd server && npm run test:ci
```

#### מסד נתונים לבדיקות
הבדיקות משתמשות במסד נתונים נפרד (`scheduling_test`) כדי לא להפריע לנתוני הפיתוח:
- הגדרה אוטומטית לפני כל הבדיקות
- ניקוי בין בדיקות
- הרס אוטומטי בסיום הבדיקות

#### דוחות כיסוי קוד
דוחות כיסוי הקוד נוצרים בתיקייה `server/coverage/`:
- `coverage/index.html` - דוח HTML
- `coverage/lcov.info` - פורמט LCOV
- `coverage/coverage-final.json` - פורמט JSON

### עבודה עם מסד הנתונים

```bash
# יצירת migration חדש
cd server && npx prisma migrate dev --name migration_name

# יצירת Prisma client
cd server && npm run db:generate

# פתיחת Prisma Studio
cd server && npm run db:studio

# טעינת נתונים לדוגמה
cd server && npm run db:seed
```

## 🔧 הגדרות

### משתני סביבה

#### מצב PostgreSQL משובץ (ברירת מחדל)

**אין צורך ביצירת קובץ .env** - המערכת תעבוד מיד עם PostgreSQL משובץ.

אם תרצה להתאים הגדרות, תוכל ליצור קובץ `server/.env` על בסיס `server/env.example`:

```env
# הגדרות מסד נתונים משובץ (ברירת מחדל)
DB_TYPE=embedded

# הגדרות שרת
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

#### מצב מסד נתונים חיצוני

קובץ `server/.env` למסד נתונים חיצוני:

```env
# הגדרות מסד נתונים חיצוני
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/scheduling"
DB_TYPE=remote
DB_HOST=localhost
DB_PORT=5432
DB_NAME=scheduling
DB_USER=postgres
DB_PASSWORD=postgres

# הגדרות שרת
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# הגדרות Electron (מוגדרות אוטומטית על ידי האפליקציה)
ELECTRON=false
USER_DATA_PATH=
```

## 📋 רישיון

MIT License

---

**הערה**: מערכת זו פותחה עבור גני ילדים בישראל ומותאמת לעברית ולתקני העבודה המקומיים.
