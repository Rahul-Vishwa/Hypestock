# 📈 Stock Order App

A dynamic event-based stock trading simulation platform where users can **create events** and others can **buy event-based stocks** while the event is running. The app provides real-time stock order updates, integrated payments via **Cashfree**, and live charting using **lightweight-charts**.

---

## 🚀 Features

- 🗓️ Create and manage custom events (e.g., sports, elections, product launches)
- 📈 Buy event-based stocks while the event is active
- 🔄 Real-time order updates using `socket.io`
- 📊 Live chart display with `lightweight-charts`
- 💳 Integrated payments via **Cashfree**
- 🔐 Authenticated user access via **Auth0**
- 🔚 Stock trading automatically closes after event ends
- 🗄️ Uses **PostgreSQL** via **Supabase** as backend database

---

## 🧱 Tech Stack

| Layer       | Technology              |
|-------------|--------------------------|
| Frontend    | Angular 19, Tailwind CSS |
| Backend     | Node.js + Express        |
| Charts      | [lightweight-charts](https://github.com/tradingview/lightweight-charts) |
| Realtime    | socket.io                |
| Payments    | Cashfree                 |
| Auth        | Auth0                    |
| Database    | Supabase PostgreSQL      |
