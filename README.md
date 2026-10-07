# SwiggyApp Backend

A food delivery backend REST API inspired by Swiggy, built with Node.js, Express and TypeScript.

## Tech Stack

- Node.js
- Express
- TypeScript
- MongoDB
- Redis
- JWT

## Getting Started

### Prerequisites

- Node.js 20 or newer
- MongoDB
- Redis

### Installation

```bash
git clone https://github.com/y0emad/swiggyApp.git
cd swiggyApp
npm install
```

### Environment variables

Create a `.env` file in the project root:

```
PORT=3000
MONGO_URL=mongodb://127.0.0.1:27017/swiggy
REDIS_URL=redis://127.0.0.1:6379
JWT_ACCESS_SECRET=your-secret
JWT_REFRESH_SECRET=your-secret
```

### Run

```bash
npm run dev
```
