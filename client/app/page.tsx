'use client';

import { Button } from '@/components/ui/button';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { z } from 'zod';

const formSchema = z.object({
  organizationName: z
    .string()
    .min(2, 'Organization name must be at least 2 characters long'),
  email: z.string().includes('@', 'Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

export default function Home() {
  // const handleButtonClick = async () => {
  //   try {
  //     const response = await fetch('/api/user', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({ fullName: 'John Doe' }),
  //     });

  //     const data = await response.json();
  //     const newUser = data.user;

  //     console.log("New user inserted:", newUser);
  //   } catch (error) {
  //     console.error("Error inserting user:", error);
  //   }
  // }

  const router = useRouter();

  const handleRegisterOrganization = () => {
    console.log('Registering organization...');

    // TODO: Implement organization registration logic
    setTimeout(() => {
      console.log('Organization registered successfully!');
    }, 3000);

    // After registration, navigate to dashboard
    router.push('/dashboard');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <section className="absolute top-20 text-center flex flex-col items-center gap-10">
        <h1 className="text-5xl font-bold text-zinc-800 dark:text-zinc-200">
          Welcome to Babble
        </h1>
        <Image src="/babble.jpg" alt="Babble Logo" width={300} height={300} />
      </section>

      <section className="absolute bottom-20 text-center flex flex-col items-center gap-4">
        <h2 className="text-2xl font-semibold text-zinc-700 dark:text-zinc-300">
          Join Babble Today!
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          Connect, communicate, and collaborate with ease.
        </p>
        <Dialog>
          <DialogTrigger asChild>
            <Button
              className="mt-8 bg-emerald-200"
              variant="outline"
              onClick={handleRegisterOrganization}
            >
              Register Organization
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg text-center p-12 flex flex-col items-center gap-6">
            <DialogTitle className="text-2xl font-bold mb-4 flex flex-col items-center gap-4">
              Register Your Organization
              <DialogDescription className="text-zinc-600 dark:text-zinc-400">
                Organization registration form goes here.
              </DialogDescription>
            </DialogTitle>

            <section className="flex flex-col gap-4 w-full">
              <Input placeholder="Organization Name" />
              <Input placeholder="Email Address" />
              <Input placeholder="Password" type="password" />
              <Button className="bg-emerald-200">Register</Button>
            </section>
          </DialogContent>
        </Dialog>
      </section>
    </div>
  );
}
