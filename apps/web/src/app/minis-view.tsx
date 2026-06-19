'use client';

import { useGetMinis, useCreateMini, getGetMinisQueryKey } from '@repo/queries';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@repo/ui/components/ui/button';
import { Card } from '@repo/ui/components/ui/card';
import { Input } from '@repo/ui/components/ui/input';
import { useState } from 'react';

export function MinisView() {
  const queryClient = useQueryClient();
  const { data: minis, isLoading } = useGetMinis();
  const createMini = useCreateMini({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: getGetMinisQueryKey() });
      },
    },
  });

  const [name, setName] = useState('');
  const [faction, setFaction] = useState('');

  const handleCreate = () => {
    if (!name.trim()) return;
    createMini.mutate({
      data: { name, faction: faction || undefined },
    });
    setName('');
    setFaction('');
  };

  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: 24 }}>
      <h1 className="text-2xl font-bold">Minis</h1>

      <Card className="p-4 my-4 flex gap-2">
        <Input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          placeholder="Faction (optional)"
          value={faction}
          onChange={(e) => setFaction(e.target.value)}
        />
        <Button onClick={handleCreate} disabled={createMini.isPending}>
          Add
        </Button>
      </Card>

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <ul className="space-y-2">
          {minis?.map((mini) => (
            <li key={mini.id}>
              <Card className="p-3">
                <strong>{mini.name}</strong>
                {mini.faction ? ` — ${mini.faction}` : ''}
                {mini.isPainted ? ' ✅' : ' ⬜'}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
