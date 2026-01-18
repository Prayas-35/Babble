"use client";

import Image from "next/image";

export default function Home() {

  const handleButtonClick = async () => {
    try {
      const response = await fetch('/api/user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fullName: 'John Doe' }),
      });

      const data = await response.json();
      const newUser = data.user;

      console.log("New user inserted:", newUser);
    } catch (error) {
      console.error("Error inserting user:", error);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <button
        className="rounded-full bg-white/10 px-10 py-3 font-semibold no-underline transition hover:bg-white/20 hover:shadow-lg focus:bg-white/20 focus:shadow-lg focus:outline-none dark:bg-white/10 dark:hover:bg-white/20 dark:focus:bg-white/20"
        onClick={handleButtonClick}
      >
        Get Started
      </button>
    </div>
  );
}
