# ניהול לוח זמנים לגני תקשורת - Special needs preschool scheduling app

[![Test API](https://github.com/ygaller/oti-scheduler/actions/workflows/test.yml/badge.svg)](https://github.com/ygaller/oti-scheduler/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![SQLite](https://img.shields.io/badge/SQLite-003B57?logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![Electron](https://img.shields.io/badge/Electron-2B2E3A?logo=electron&logoColor=9FEAF9)](https://www.electronjs.org/)
[![Cross-Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS-blue)](https://github.com/ygaller/oti-scheduler)

מערכת מתקדמת לתיזמון עובדי גן ילדים עם מסד נתונים SQLite משובץ. זמינה כיישום ווב וכיישום שולחן עבודה (Electron).

## ✨ תכונות

- **ניהול תפקידים**: ניהול מלא של תפקידי העובדים - הוספה, עריכה, ומחיקה של תפקידים מותאמים אישית
- **ניהול עובדים**: הוספה, עריכה ומחיקה של עובדים עם הקצאת תפקידים והגדרות שעות עבודה מותאמות אישית
- **ניהול מטופלים**: הוספה, עריכה ומחיקה של מטופלים עם דרישות טיפול מותאמות לפי תפקידים וקידוד צבעים
- **ניהול חדרי טיפול**: ניהול חדרי הטיפול הזמינים
- **ניהול פעילויות**: הגדרת חסימות זמן וחלונות זמן אסורים לתיזמון
- **יצירת לוח זמנים אוטומטי**: אלגוריתם חכם ליצירת לוח זמנים תוך התחשבות באילוצים ופעילויות
- **הגדרות מערכת**: קביעת זמני ארוחות ומפגשים וניהול תפקידים
- **איפוס נתונים**: אפשרות לאיפוס מלא של המערכת
- **מסד נתונים משובץ**: SQLite משובץ - קל, מהיר ואמין ללא צורך בהתקנת מסד נתונים נוסף
- **יישום שולחן עבודה**: אפליקציה עצמאית ב-Electron עבור Windows ו-macOS
- **הפצה צולבת פלטפורמה**: חבילות התקנה מוכנות עבור פלטפורמות שונות

## 🏗 ארכיטקטורה

```
Client (React + TypeScript)
        ↕ HTTP API
Server (Express.js + Prisma)
        ↕
Database (SQLite)
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

#### התקנה והפעלה (מומלץ)

המערכת מגיעה עם SQLite משובץ כברירת מחדל - אין צורך בהתקנה נוספת של מסד נתונים:

```bash
# הפעלת השרת והלקוח במקביל עם SQLite משובץ
npm run dev
```

או באופן נפרד:

```bash
# הפעלת השרת עם SQLite משובץ
npm run server:dev

# הפעלת הלקוח בלבד (בטרמינל נפרד)
npm run client:dev
```

**דרישות למערכת:**
- Node.js גרסה 18 ומעלה
- npm או yarn
- **אין צורך בהתקנת מסד נתונים נוסף!**

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

### SQLite (ברירת מחדל)

המערכת משתמשת ב-SQLite כברירת מחדל. מסד הנתונים:
- מתחיל אוטומטית עם השרת ללא צורך בהתקנה נוספת
- נשמר בקובץ מקומי (למשל: `~/.oti-scheduler/database/scheduling.db`)
- כולל ניהול אוטומטי של migrations עם fallback programmatic migration
- מספק פשטות, מהירות ואמינות
- **אין צורך בהגדרת קבצי .env**
- **תמיכה מלאה ב-Electron למערכות Windows ו-macOS**

#### תכונות מיוחדות של מערכת ה-Migration

המערכת כוללת מנגנון migration מתקדם שמטפל באתגרים של Electron:

1. **Programmatic Migration**: אם Prisma CLI לא זמין (כמו ב-Electron), המערכת מריצה את ה-migrations באופן programmatic
2. **Fallback Strategy**: ניסיון ראשון עם Prisma CLI, נפילה למערכת הפנימית במידת הצורך  
3. **Cross-Platform Support**: עובד בצורה מושלמת על Windows, macOS ו-Linux
4. **Electron Optimization**: התאמה מיוחדת לסביבת Electron עם זיהוי אוטומטי של נתיבי קבצים

#### הפעלה

```bash
# פשוט הפעל את המערכת - SQLite יתחיל אוטומטית
npm run dev
```



**הערה**: במצב משובץ, הפורט נקבע דינמית ולא ניתן להגדירו מראש.

### טעינת נתונים לדוגמה

```bash
npm run server:db:seed
```

נתוני הדוגמה כוללים:
- 5 תפקידי ברירת מחדל (ריפוי בעיסוק, קלינאות תקשורת, פיזיותרפיה, עבודה סוציאלית, טיפול בהבעה ויציאה)
- 3 עובדים מקצועיים עם הקצאת תפקידים
- 5 מטופלים עם דרישות טיפול מותאמות
- 4 חדרי טיפול
- פעילויות שוטפות לדוגמה

## 📡 API Endpoints

### תפקידים
- `GET /api/roles` - קבלת כל התפקידים הפעילים
- `GET /api/roles?includeInactive=true` - קבלת כל התפקידים כולל לא פעילים
- `GET /api/roles/:id` - קבלת תפקיד לפי ID
- `POST /api/roles` - יצירת תפקיד חדש
- `PUT /api/roles/:id` - עדכון תפקיד
- `PATCH /api/roles/:id/active` - שינוי סטטוס פעילות תפקיד
- `DELETE /api/roles/:id` - מחיקת תפקיד (אם לא מוקצה לעובדים)
- `GET /api/roles/:id/employee-count` - מספר עובדים המוקצים לתפקיד

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

## 📦 תהליך שחרור (Release Process)

### 🚀 יצירת גרסה חדשה

המערכת כוללת סקריפט אוטומטי לניהול שחרורים שמבצע את כל השלבים הנדרשים:

```bash
# שחרור גרסה חדשה עם בניה מוכנת לייצור
node scripts/release.js --version 1.2.3 --prerelease

# שחרור גרסה ללא הפעלת תהליך בניה אוטומטי
node scripts/release.js --version 1.2.3

# שימוש בסוגי שחרור שונים
node scripts/release.js --version 1.2.3 --type patch --prerelease
node scripts/release.js --version 1.3.0 --type minor --prerelease  
node scripts/release.js --version 2.0.0 --type major --prerelease
```

### 🎯 אפשרויות סקריפט השחרור

#### פרמטרים נדרשים:
- `--version <version>`: גרסת השחרור (למשל: 1.2.3)

#### פרמטרים אופציונליים:
- `--type <type>`: סוג השחרור (`patch`, `minor`, `major`) - ברירת מחדל: `patch`
- `--prerelease`: יוצר גרסת prerelease עם חתימה דיגיטלית מלאה
- `--dry-run`: מציג מה יבוצע מבלי לבצע בפועל
- `--help`, `-h`: מציג הוראות שימוש

#### דוגמאות שימוש:

```bash
# שחרור רגיל עם בניה וחתימה דיגיטלית (מומלץ לייצור)
node scripts/release.js --version 1.2.3 --prerelease

# בדיקה מה יבוצע לפני השחרור
node scripts/release.js --version 1.2.3 --prerelease --dry-run

# שחרור מהיר בלי הפעלת GitHub Actions
node scripts/release.js --version 1.2.3

# שחרור גרסה ראשית חדשה
node scripts/release.js --version 2.0.0 --type major --prerelease
```

### 🔄 מה קורה בתהליך השחרור?

הסקריפט מבצע באופן אוטומטי:

1. **בדיקת סביבת העבודה** - וידוא שהקוד נקי וללא שינויים לא שמורים
2. **הרצת בדיקות** - הרצת כל הבדיקות האוטומטיות (`npm test`)
3. **עדכון קבצי package.json** - עדכון הגרסה בכל הקבצים:
   - `package.json` (שורש)
   - `client/package.json`
   - `server/package.json`
   - `package-lock.json` (כל הקבצים)
4. **בניית האפליקציה** - הכנת קבצים לייצור (`npm run prepare:electron`)
5. **שמירת שינויים** - commit אוטומטי של עדכוני הגרסה
6. **יצירת tag** - יצירת git tag לגרסה החדשה
7. **דחיפה לשרת** - העלאת השינויים וה-tag ל-GitHub

### 🏷️ סוגי Tags ושמות גרסאות

#### Tags רגילים:
```bash
v1.2.3        # גרסה רגילה - לא מפעילה בניה אוטומטית
```

#### Tags עם prerelease (מומלץ):
```bash
v1.2.3-release    # מפעיל בניה עם חתימה דיגיטלית
```

### ⚙️ GitHub Actions - בניה אוטומטית

כאשר משתמשים ב-flag `--prerelease`, נוצר tag עם סיומת `-release` שמפעיל:

#### 🔧 תהליך בניה מלא:
- **בניה עבור Windows** (64-bit) עם חתימה דיגיטלית
- **בניה עבור macOS** (Intel + Apple Silicon) עם notarization
- **יצירת קבצי התקנה** (.exe עבור Windows, .dmg עבור macOS)
- **העלאה אוטומטית ל-GitHub Releases** עם תיאור מפורט

#### 📁 תוצרי הבניה:
- `oti-scheduler-v1.2.3.dmg` (macOS Universal)
- `oti-scheduler-v1.2.3-arm64.dmg` (macOS Apple Silicon)
- `oti-scheduler Setup v1.2.3.exe` (Windows 64-bit)

### 🔐 חתימה דיגיטלית ואבטחה

#### Windows:
- חתימה עם EV Certificate
- תמיכה ב-Windows SmartScreen
- הגנה מפני זיוף ותוכנות זדוניות

#### macOS:
- חתימה עם Developer Certificate
- Notarization על ידי Apple
- תמיכה ב-Gatekeeper
- הורדת אזהרות אבטחה

### 📋 רשימת בדיקות לפני שחרור

לפני הרצת סקריפט השחרור, וודאו:

- [ ] כל הקוד נבדק ועובד כראוי
- [ ] הבדיקות האוטומטיות עוברות בהצלחה
- [ ] התיעוד עודכן בהתאם לשינויים
- [ ] אין קבצים שונו ולא נשמרו
- [ ] הגרסה החדשה עוקבת אחר Semantic Versioning

### 🚨 פתרון בעיות שחרור

#### בעיות נפוצות:

```bash
# שגיאה: Working directory is not clean
git status                    # בדוק מה השתנה
git add . && git commit -m "fix: prepare for release"

# שגיאה: Tests failed  
npm test                     # הרץ בדיקות וראה מה נכשל
npm run test:fix             # תקן בעיות אם יש

# שגיאה: Network issues
git push origin main         # נסה לדחוף ידנית
git push origin v1.2.3-release  # דחוף את ה-tag
```

### 📈 מעקב אחר בניות

לאחר השחרור עם `--prerelease`, ניתן לעקוב אחר התהליך:

1. **GitHub Actions**: https://github.com/ygaller/oti-scheduler/actions
2. **Releases**: https://github.com/ygaller/oti-scheduler/releases
3. **Tags**: https://github.com/ygaller/oti-scheduler/tags

## 🏥 ניהול תפקידים

### תכונות ניהול תפקידים

המערכת כוללת ניהול מתקדם של תפקידי עובדים:

#### תפקידי ברירת מחדל
המערכת מגיעה עם 5 תפקידי ברירת מחדל (בסדר אלפביתי):
- **טיפול בהבעה ויציאה** (`role_1`)
- **עבודה סוציאלית** (`role_2`)
- **פיזיותרפיה** (`role_3`)
- **קלינאות תקשורת** (`role_4`)
- **ריפוי בעיסוק** (`role_5`)

#### יכולות ניהול תפקידים
- **הוספת תפקידים חדשים**: יצירת תפקידים מותאמים אישית
- **עריכת תפקידים**: שינוי שמות תפקידים קיימים (כולל ברירת מחדל)
- **ניהול סטטוס**: הפעלה וביטול הפעלה של תפקידים
- **מחיקת תפקידים**: מחיקה בטוחה (רק אם אין עובדים מוקצים)
- **ספירת עובדים**: מעקב אחר כמות העובדים המוקצים לכל תפקיד

#### מפתחות תפקיד (Role String Keys)
כל תפקיד מקבל מפתח יחודי בפורמט `role_X` (לדוגמה: `role_1`, `role_2`) המשמש:
- **דרישות טיפול**: הגדרת דרישות טיפול במטופלים
- **ייצוא נתונים**: מזהים ברי קריאה בקבצי Excel
- **API**: הפניות למסד הנתונים

#### הגנת נתונים
- **מניעת מחיקה**: לא ניתן למחוק תפקיד המוקצה לעובדים
- **הודעות שגיאה**: הודעות בעברית עם פרטי מספר העובדים המושפעים
- **תיקוף נתונים**: בדיקת תקינות שמות תפקידים ומניעת כפילויות

### ממשק המשתמש

#### לוח התפקידים
נמצא בלשונית "הגדרות" וכולל:
- **טבלת תפקידים**: רשימה מלאה עם שמות, מפתחות ומספר עובדים
- **כפתורי פעולה**: עריכה, שינוי סטטוס, ומחיקה לכל תפקיד
- **סינון תפקידים**: הצגת תפקידים פעילים בלבד או כולל לא פעילים
- **הוספת תפקיד**: טופס פשוט להוספת תפקידים חדשים

#### הקצאת תפקידים לעובדים
- **רשימה דינמית**: בחירת תפקיד מרשימה מעודכנת של תפקידים פעילים
- **הצגה ברורה**: הצגת שמות תפקידים בעברית בטבלאות ובטפסים
- **תיקוף**: מניעת יצירת עובדים ללא הקצאת תפקיד

#### דרישות טיפול למטופלים
- **ממשק אינטואיטיבי**: הגדרת מספר טיפולים לכל תפקיד
- **עדכון אוטומטי**: רשימת התפקידים מתעדכנת בהתאם לתפקידים הפעילים
- **הצגה ויזואלית**: תגיות צבעוניות עם שמות תפקידים ומספרי טיפולים

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
