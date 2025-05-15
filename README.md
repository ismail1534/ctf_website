# CTF Competition Website

A full-stack web application for running Capture The Flag (CTF) competitions among classmates.

## Features

### User Features

- User registration and login
- View and solve challenges
- Submit flags to earn points
- Leaderboard to track progress and ranking

### Admin Features

- Separate admin login
- Create, edit, and delete challenges
- Upload challenge files
- Ban/unban users
- Toggle site between "Live Mode" and "Leaderboard Only Mode"

## Technology Stack

- **Frontend**: HTML, CSS, JavaScript (vanilla)
- **Backend**: Node.js, Express
- **Database**: MongoDB
- **File Storage**: Local server storage

## Installation

1. Clone the repository:

```
git clone https://github.com/yourusername/ctf-website.git
cd ctf-website
```

2. Install dependencies:

```
npm install
```

3. Create a `.env` file in the root directory with the following variables:

```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/ctf_website
SESSION_SECRET=your_session_secret_key_here
```

4. Start the server:

```
npm start
```

Or for development with auto-reload:

```
npm run dev
```

## Project Structure

- `/config` - Configuration files for MongoDB
- `/middleware` - Authentication and upload middleware
- `/models` - MongoDB models (User, Challenge, SiteConfig)
- `/public` - Static assets (CSS, JavaScript, uploads)
- `/routes` - API routes (auth, challenges, admin, leaderboard)
- `/views` - Frontend views

## Initial Setup

On first run, you'll need to create an admin user. You can do this by:

1. Register a normal user
2. Connect to MongoDB and manually set the `isAdmin` field to `true` for that user:

```
db.users.updateOne({username: "your_username"}, {$set: {isAdmin: true}})
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.
