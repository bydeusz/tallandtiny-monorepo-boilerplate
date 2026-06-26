'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Alert,
  AlertDescription,
  AlertTitle,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@repo/ui/molecules';
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Checkbox,
  NavLink,
  Skeleton,
  Switch,
} from '@repo/ui/atoms';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@repo/ui/organisms';

export function UiDemo() {
  return (
    <section style={{ maxWidth: 640, margin: '0 auto', padding: '24px 24px 0' }}>
      <h2 className="text-lg font-semibold">shadcn UI demo</h2>
      <p className="text-sm text-muted-foreground mb-3">
        Shared <code>Button</code> + <code>Dialog</code> from{' '}
        <code>@repo/ui</code>, used here in the web app.
      </p>

      {/* Original: Button + Dialog */}
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

      {/* Badge */}
      <div className="mt-6">
        <h3 className="text-sm font-medium mb-2">Badge</h3>
        <div className="flex gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="outline">Outline</Badge>
        </div>
      </div>

      {/* Skeleton */}
      <div className="mt-6">
        <h3 className="text-sm font-medium mb-2">Skeleton</h3>
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-32 mt-2" />
      </div>

      {/* Alert */}
      <div className="mt-6">
        <h3 className="text-sm font-medium mb-2">Alert</h3>
        <Alert>
          <AlertTitle>Info</AlertTitle>
          <AlertDescription>This is an informational alert.</AlertDescription>
        </Alert>
      </div>

      {/* Accordion */}
      <div className="mt-6">
        <h3 className="text-sm font-medium mb-2">Accordion</h3>
        <Accordion type="single" collapsible>
          <AccordionItem value="item-1">
            <AccordionTrigger>What is @repo/ui?</AccordionTrigger>
            <AccordionContent>
              A shared shadcn primitives package for the monorepo.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Tabs */}
      <div className="mt-6">
        <h3 className="text-sm font-medium mb-2">Tabs</h3>
        <Tabs defaultValue="tab-a">
          <TabsList>
            <TabsTrigger value="tab-a">Tab A</TabsTrigger>
            <TabsTrigger value="tab-b">Tab B</TabsTrigger>
          </TabsList>
          <TabsContent value="tab-a">Content for Tab A</TabsContent>
          <TabsContent value="tab-b">Content for Tab B</TabsContent>
        </Tabs>
      </div>

      {/* Avatar */}
      <div className="mt-6">
        <h3 className="text-sm font-medium mb-2">Avatar</h3>
        <Avatar>
          <AvatarFallback>TD</AvatarFallback>
        </Avatar>
      </div>

      {/* Select */}
      <div className="mt-6">
        <h3 className="text-sm font-medium mb-2">Select</h3>
        <Select>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Pick one" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option-1">Option 1</SelectItem>
            <SelectItem value="option-2">Option 2</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Checkbox */}
      <div className="mt-6">
        <h3 className="text-sm font-medium mb-2">Checkbox</h3>
        <div className="flex items-center gap-2">
          <Checkbox id="smoke-checkbox" />
          <label htmlFor="smoke-checkbox" className="text-sm">
            Accept terms
          </label>
        </div>
      </div>

      {/* Switch */}
      <div className="mt-6">
        <h3 className="text-sm font-medium mb-2">Switch</h3>
        <Switch />
      </div>

      {/* Tooltip */}
      <div className="mt-6">
        <h3 className="text-sm font-medium mb-2">Tooltip</h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline">Hover me</Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Tooltip content</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Carousel */}
      <div className="mt-6">
        <h3 className="text-sm font-medium mb-2">Carousel</h3>
        <Carousel>
          <CarouselContent>
            <CarouselItem>
              <div className="border rounded p-4 text-sm">Slide 1</div>
            </CarouselItem>
            <CarouselItem>
              <div className="border rounded p-4 text-sm">Slide 2</div>
            </CarouselItem>
          </CarouselContent>
        </Carousel>
      </div>

      {/* NavLink */}
      <div className="mt-6 mb-6">
        <h3 className="text-sm font-medium mb-2">NavLink</h3>
        <NavLink href="/">Home</NavLink>
      </div>
    </section>
  );
}
