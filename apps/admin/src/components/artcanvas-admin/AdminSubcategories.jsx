import React, { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useArtAdmin } from "@/contexts/art-admin-context";
import { api } from "@/lib/art-api";

const GROUPS = [
  { id: "women", label: "Women" },
  { id: "men", label: "Men" },
  { id: "kids", label: "Children" },
];

export default function AdminSubcategories() {
  const { refreshSubcategories } = useArtAdmin();

  const [data, setData] = useState(null);
  const [group, setGroup] = useState("women");
  const [name, setName] = useState("");
  const [editing, setEditing] = useState(null);
  const [editName, setEditName] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setError("");
      setData(await api.adminSubcategories());
    } catch (e) {
      setError(e?.message || "Could not load sub-categories.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setBusy("add");
    setError("");

    try {
      await api.createSubcategory(group, name.trim());
      setName("");
      await Promise.all([load(), refreshSubcategories()]);
    } catch (e) {
      setError(e?.message || "Could not add sub-category.");
    } finally {
      setBusy("");
    }
  };

  const save = async (s) => {
    if (!editName.trim()) return;

    const originalName = s.originalName || s.name;
    setBusy(`edit:${originalName}`);
    setError("");

    try {
      await api.updateSubcategory(group, originalName, editName.trim());
      setEditing(null);
      setEditName("");
      await Promise.all([load(), refreshSubcategories()]);
    } catch (e) {
      setError(e?.message || "Could not update sub-category.");
    } finally {
      setBusy("");
    }
  };

  const remove = async (s) => {
    if (!confirm(`Delete "${s.name}" from ${group}?`)) return;

    const itemName = s.originalName || s.name;
    setBusy(`del:${itemName}`);
    setError("");

    try {
      await api.deleteSubcategory(group, s.name);
      await Promise.all([load(), refreshSubcategories()]);
    } catch (e) {
      setError(e?.message || "Could not delete sub-category.");
    } finally {
      setBusy("");
    }
  };

  const restore = async (s) => {
    const originalName = s.originalName || s.name;
    setBusy(`restore:${originalName}`);
    setError("");

    try {
      await api.createSubcategory(group, originalName);
      await Promise.all([load(), refreshSubcategories()]);
    } catch (e) {
      setError(e?.message || "Could not restore sub-category.");
    } finally {
      setBusy("");
    }
  };

  const list = data?.[group] || [];

  return (
    <div className="mt-2 max-w-2xl space-y-5">
      <div className="flex gap-2 flex-wrap">
        {GROUPS.map((g) => (
          <button
            type="button"
            key={g.id}
            onClick={() => {
              setGroup(g.id);
              setEditing(null);
              setEditName("");
              setError("");
            }}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase ${
              group === g.id
                ? "bg-black text-white"
                : "border border-current/15"
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      <form onSubmit={add} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={`Add / restore ${
            GROUPS.find((g) => g.id === group)?.label
          } sub-category…`}
          className="flex-1 px-3 py-2.5 rounded-xl border border-current/15 bg-transparent text-sm"
        />

        <button
          type="submit"
          disabled={!name.trim() || busy === "add"}
          className="px-5 rounded-full bg-black text-white text-xs uppercase font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy === "add" ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Plus size={13} />
          )}
          Add
        </button>
      </form>

      {error && <p className="text-xs text-[#A8431E]">{error}</p>}

      <div className="space-y-2">
        {list.map((s) => {
          const key = s.originalName || s.name;

          return (
            <div
              key={key}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                s.hidden
                  ? "border-[#A8431E]/20 opacity-70"
                  : "border-current/10"
              }`}
            >
              {editing === key ? (
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 px-2 py-1.5 rounded-lg border border-current/15 bg-transparent"
                />
              ) : (
                <div className="flex-1">
                  <span>{s.name}</span>

                  {s.builtin && (
                    <span className="ml-2 text-[9px] opacity-40 uppercase">
                      Default
                    </span>
                  )}

                  {s.hidden && (
                    <span className="ml-2 text-[9px] text-[#A8431E] uppercase">
                      Deleted
                    </span>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                {editing === key ? (
                  <>
                    <button
                      type="button"
                      disabled={!editName.trim() || busy === `edit:${key}`}
                      onClick={() => save(s)}
                      className="text-[10px] uppercase font-semibold disabled:opacity-50"
                    >
                      {busy === `edit:${key}` ? "Saving…" : "Save"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditing(null);
                        setEditName("");
                      }}
                      className="text-[10px] uppercase opacity-50"
                    >
                      Cancel
                    </button>
                  </>
                ) : s.hidden ? (
                  <button
                    type="button"
                    disabled={busy === `restore:${key}`}
                    onClick={() => restore(s)}
                    className="text-[10px] uppercase font-semibold disabled:opacity-50"
                  >
                    {busy === `restore:${key}` ? "Restoring…" : "Restore"}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(key);
                        setEditName(s.name);
                        setError("");
                      }}
                      className="text-[10px] uppercase font-semibold"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      disabled={busy === `del:${key}`}
                      onClick={() => remove(s)}
                      className="w-7 h-7 rounded-full border border-[#A8431E]/25 text-[#A8431E] flex items-center justify-center disabled:opacity-50"
                      aria-label={`Delete ${s.name}`}
                    >
                      {busy === `del:${key}` ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Trash2 size={12} />
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {data && list.length === 0 && (
          <p className="py-6 text-sm opacity-50">
            No sub-categories found for {GROUPS.find((g) => g.id === group)?.label}.
          </p>
        )}
      </div>
    </div>
  );
}
