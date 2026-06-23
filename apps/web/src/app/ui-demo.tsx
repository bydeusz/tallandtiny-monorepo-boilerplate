'use client';

import { Button } from '@repo/ui/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@repo/ui/components/ui/dialog';

export function UiDemo() {
  return (
    <section style={{ maxWidth: 640, margin: '0 auto', padding: '24px 24px 0' }}>
      <h2 className="text-lg font-semibold">shadcn UI demo</h2>
      <p className="text-sm text-muted-foreground mb-3">
        Shared <code>Button</code> + <code>Dialog</code> from{' '}
        <code>@repo/ui</code>, used here in the web app.
      </p>

      <Dialog>
        <DialogTrigger asChild>
          <Button>Open modal</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hello from @repo/ui</DialogTitle>
            <DialogDescription>
              This button and dialog are shared shadcn components. Add them once
              to @repo/ui and every app uses the same styled primitives.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
