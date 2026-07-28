"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type AgentOption = {
  id: string;
  fullName: string;
  agencyName?: string | null;
  email: string;
  image?: string | null;
};

type AgentSearchFieldProps = {
  value: string | null;
  onChange: (agentId: string | null, agent?: AgentOption | null) => void;
  className?: string;
};

export function AgentSearchField({ value, onChange, className }: AgentSearchFieldProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AgentOption[]>([]);
  const [selected, setSelected] = useState<AgentOption | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/agents/search?q=${encodeURIComponent(query.trim())}`);
        const json = await res.json();
        setResults(json.data ?? []);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const pickAgent = (agent: AgentOption) => {
    setSelected(agent);
    setQuery(agent.fullName);
    setResults([]);
    onChange(agent.id, agent);
  };

  const clearAgent = () => {
    setSelected(null);
    setQuery("");
    onChange(null, null);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Label>Affiliate (optional)</Label>
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (selected && e.target.value !== selected.fullName) {
            setSelected(null);
            onChange(null, null);
          }
        }}
        placeholder="Search verified Affiliate by name"
      />
      <p className="text-xs text-muted-foreground">
        Affiliate must be signed in, verified, and have a profile photo. They will receive
        notifications and can be contacted by buyers.
      </p>
      {loading ? <p className="text-xs text-muted-foreground">Searching...</p> : null}
      {results.length > 0 ? (
        <ul className="max-h-48 overflow-y-auto rounded-md border bg-white shadow-sm">
          {results.map((agent) => (
            <li key={agent.id}>
              <button
                type="button"
                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-emerald-50"
                onClick={() => pickAgent(agent)}
              >
                {agent.image ? (
                  <Image
                    src={agent.image}
                    alt=""
                    width={32}
                    height={32}
                    className="size-8 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex size-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-medium text-emerald-800">
                    {agent.fullName.slice(0, 2).toUpperCase()}
                  </span>
                )}
                <span>
                  <span className="block text-sm font-medium">{agent.fullName}</span>
                  <span className="block text-xs text-muted-foreground">{agent.email}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {(value || selected) && (
        <button
          type="button"
          className="text-xs text-emerald-700 hover:underline"
          onClick={clearAgent}
        >
          Clear Affiliate selection
        </button>
      )}
    </div>
  );
}
