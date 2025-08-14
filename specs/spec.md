We are creating a scheduling app to schedule a preschool staff

# Tech requirements
* Use React + Typescript
* The app should be mobile responsive
* Data is currently stored in memory - no need for persistent storage

# UI
* The UI is in Hebrew. The direction of the app is RTL
* Use a modern bright UI system

# The Schedule
* The first day of the week is Sunday, the last day is Thursday and the schedule includes every day in between
* There are recurring daily slots for breakfast, morning meetup and lunch. These periods should be configurable in the UI and are at the same time each day
* Scheduling of sessoins

# Entities

## Employees - Each employee will have the following properties
* First name
* Last name
* Role - The role of the employee can be one of the following: Occupational Therapist, Speech Therapist, Physiotherapist, Social worker, Art Therapist
* Day in which he works - For each weekday, there is a definition of starting hour and ending hour (time range). Employees can have different working hours on different days or even no hours for particular days.
* Number of weekly sessions - Each session is 45 minutes
* We can add or remove an employee as well as edit all of the properties of an existing employee
* 

## Rooms
* Each room has a name
* Rooms can be added, removed or renamed

# Scheduling algorithm

A session is 45 minutes

Each room may have one session assigned to it at any given time. There can be no overlap of sessions for the same room.

When clicking on the "Generate schedule" button, the app will create a schedule by assigning employees to rooms. 

The employee may only be assigned to a room during his working hours.
The employee must be assigned to the number of sessions as defined in his weekly sessions.
An employee can be assigned to two consecutive sessions in a row at most. After that a minimum of 5 minutes break must also be scheduled. This break will appear as a gap in the schedule.
No sessions can be scheduled during breakfast, morning meetup and lunch.
An employee cannot have two sessions at the same time.
Rooms cannot be double booked.
Earliest and latest sessions times are based on employee availability (their schedule). Rooms do not have time boundaries of earlist or latest time.
The sessions can start at any time, not just in rounded hours.
There is no priority for particular employees or rooms.
After the schedule is generated, we should have the option to override it manually. Manual overrides should fail due to the specified constraints.
There is no restriction on which type of employee can use which room.
A schedule can be exported as a csv file.



# Glossary for UI
* Days of the week (Sun-Thu) - יום ראשון, יום שני, יום שלישי, יום רביעי, יום חמישי
* Roles
** Occupational Therapist - ריפוי בעיסוק
** Speech Therapist - קלינאות תקשורת
** Pysiotherapist - פיזיותרפיה
** Social worker - עבודה סוציאלית
** Art Therapist - טיפול בהבעה ויציאה
** Room - חדר טיפול
** Session - טיפול
** Breakfast - ארוחת בוקר
** Lunch - ארוחת צהריים
** Morning Meetup - מפגש בוקר
