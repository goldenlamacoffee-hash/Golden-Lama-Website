"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ROLE_LABELS, type AdminRole, type Capability } from "@/lib/permissions"
import { ArrowLeft, LogOut, UserPlus, KeyRound, Trash2, Pencil, Loader2 } from "lucide-react"

interface UserDto {
  id: string
  email: string
  name: string
  role: AdminRole
  isActive: boolean
  createdAt: string
  lastLoginAt: string | null
}

interface UsersManagerProps {
  currentUser: { id: string; email: string; name: string; role: AdminRole }
  initialUsers: UserDto[]
  assignableRoles: AdminRole[]
  capabilities: Capability[]
}

const roleBadgeClass: Record<AdminRole, string> = {
  owner: "bg-[#E09E14] text-[#28170F]",
  admin: "bg-[#c88a10] text-[#28170F]",
  manager: "bg-[#8C6F4E] text-[#F5E3C2]",
  content_editor: "bg-[#6b5640] text-[#F5E3C2]",
  staff: "bg-[#4a3526] text-[#F5E3C2]",
}

function formatDate(value: string | null): string {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("sk-SK", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export function UsersManager({ currentUser, initialUsers, assignableRoles, capabilities }: UsersManagerProps) {
  const router = useRouter()
  const [users, setUsers] = useState<UserDto[]>(initialUsers)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  const canWrite = capabilities.includes("users:write")

  // create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({ name: "", email: "", password: "", role: assignableRoles[0] ?? "staff" })

  // edit dialog
  const [editUser, setEditUser] = useState<UserDto | null>(null)
  const [editForm, setEditForm] = useState({ name: "", role: "staff" as AdminRole })

  // password dialog
  const [pwUser, setPwUser] = useState<UserDto | null>(null)
  const [newPassword, setNewPassword] = useState("")

  // delete confirm
  const [deleteTarget, setDeleteTarget] = useState<UserDto | null>(null)

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" })
    router.push("/admin/login")
    router.refresh()
  }

  const refresh = async () => {
    const res = await fetch("/api/admin/users")
    if (res.ok) {
      const data = await res.json()
      setUsers(data.users)
    }
  }

  const canManage = (u: UserDto) => {
    if (!canWrite) return false
    if (u.role === "owner") return currentUser.role === "owner"
    return assignableRoles.includes(u.role)
  }

  const handleCreate = async () => {
    setBusy(true)
    setError("")
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Nepodarilo sa vytvoriť používateľa.")
        return
      }
      setCreateOpen(false)
      setForm({ name: "", email: "", password: "", role: assignableRoles[0] ?? "staff" })
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  const openEdit = (u: UserDto) => {
    setEditUser(u)
    setEditForm({ name: u.name, role: u.role })
    setError("")
  }

  const handleEdit = async () => {
    if (!editUser) return
    setBusy(true)
    setError("")
    try {
      const isSelf = editUser.id === currentUser.id
      const payload = isSelf ? { name: editForm.name } : { name: editForm.name, role: editForm.role }
      const res = await fetch(`/api/admin/users/${editUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Nepodarilo sa upraviť používateľa.")
        return
      }
      setEditUser(null)
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  const handleToggleActive = async (u: UserDto) => {
    setBusy(true)
    setError("")
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !u.isActive }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Nepodarilo sa zmeniť stav.")
        return
      }
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  const handleResetPassword = async () => {
    if (!pwUser) return
    setBusy(true)
    setError("")
    try {
      const res = await fetch(`/api/admin/users/${pwUser.id}/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Nepodarilo sa zmeniť heslo.")
        return
      }
      setPwUser(null)
      setNewPassword("")
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setBusy(true)
    setError("")
    try {
      const res = await fetch(`/api/admin/users/${deleteTarget.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Nepodarilo sa odstrániť používateľa.")
        return
      }
      setDeleteTarget(null)
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#28170F]">
      <header className="bg-[#3a251a] border-b border-[#8C6F4E]/30 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Golden Lama Coffee" width={40} height={40} className="rounded-full" />
            <h1 className="font-heading text-xl text-[#F5E3C2]">Správa používateľov</h1>
          </div>
          <div className="flex items-center gap-4">
            <a href="/admin" className="text-[#8C6F4E] hover:text-[#E09E14] text-sm flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" />
              Späť na panel
            </a>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="border-[#8C6F4E]/50 text-[#F5E3C2] hover:bg-[#8C6F4E]/20"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Odhlásiť
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <p className="text-[#8C6F4E] text-sm">
            {users.length} {users.length === 1 ? "používateľ" : "používateľov"}
          </p>
          {canWrite && (
            <Button
              onClick={() => {
                setCreateOpen(true)
                setError("")
              }}
              className="bg-[#E09E14] hover:bg-[#c88a10] text-[#28170F]"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Pridať používateľa
            </Button>
          )}
        </div>

        {error && !createOpen && !editUser && !pwUser && (
          <p className="text-red-400 text-sm mb-4">{error}</p>
        )}

        <div className="rounded-lg border border-[#8C6F4E]/30 bg-[#3a251a] overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-[#8C6F4E]/30 hover:bg-transparent">
                <TableHead className="text-[#E09E14]">Meno</TableHead>
                <TableHead className="text-[#E09E14]">E-mail</TableHead>
                <TableHead className="text-[#E09E14]">Rola</TableHead>
                <TableHead className="text-[#E09E14]">Stav</TableHead>
                <TableHead className="text-[#E09E14]">Posledné prihlásenie</TableHead>
                <TableHead className="text-[#E09E14] text-right">Akcie</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => {
                    const manageable = canManage(u) && u.id !== currentUser.id
                    const selfRow = u.id === currentUser.id
                    // Users with write access can edit their own display name (role/active
                    // changes stay blocked for self to preserve owner protection).
                    const selfEditable = selfRow && canWrite
                return (
                  <TableRow key={u.id} className="border-[#8C6F4E]/20 hover:bg-[#28170F]/40">
                    <TableCell className="text-[#F5E3C2] font-medium">
                      {u.name}
                      {selfRow && <span className="ml-2 text-xs text-[#8C6F4E]">(vy)</span>}
                    </TableCell>
                    <TableCell className="text-[#F5E3C2]/80">{u.email}</TableCell>
                    <TableCell>
                      <Badge className={roleBadgeClass[u.role]}>{ROLE_LABELS[u.role]}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className={u.isActive ? "text-green-400" : "text-red-400"}>
                        {u.isActive ? "Aktívny" : "Neaktívny"}
                      </span>
                    </TableCell>
                    <TableCell className="text-[#F5E3C2]/70">{formatDate(u.lastLoginAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {(manageable || selfRow) && (
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Zmeniť heslo"
                            onClick={() => {
                              setPwUser(u)
                              setNewPassword("")
                              setError("")
                            }}
                            className="text-[#F5E3C2] hover:bg-[#8C6F4E]/20 h-8 w-8"
                          >
                            <KeyRound className="h-4 w-4" />
                          </Button>
                        )}
                        {manageable && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Upraviť"
                              onClick={() => openEdit(u)}
                              className="text-[#F5E3C2] hover:bg-[#8C6F4E]/20 h-8 w-8"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleToggleActive(u)}
                              disabled={busy}
                              className="text-[#F5E3C2] hover:bg-[#8C6F4E]/20 h-8 text-xs"
                            >
                              {u.isActive ? "Deaktivovať" : "Aktivovať"}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Odstrániť"
                              onClick={() => {
                                setDeleteTarget(u)
                                setError("")
                              }}
                              className="text-red-400 hover:bg-red-500/10 h-8 w-8"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {selfEditable && !manageable && (
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Upraviť meno"
                            onClick={() => openEdit(u)}
                            className="text-[#F5E3C2] hover:bg-[#8C6F4E]/20 h-8 w-8"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </main>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-[#3a251a] border-[#8C6F4E]/40 text-[#F5E3C2]">
          <DialogHeader>
            <DialogTitle className="text-[#F5E3C2]">Nový používateľ</DialogTitle>
            <DialogDescription className="text-[#8C6F4E]">
              Vytvorte nový administrátorský účet.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="c-name">Meno</Label>
              <Input
                id="c-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-[#28170F] border-[#8C6F4E]/40 text-[#F5E3C2]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-email">E-mail</Label>
              <Input
                id="c-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="bg-[#28170F] border-[#8C6F4E]/40 text-[#F5E3C2]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-password">Heslo</Label>
              <Input
                id="c-password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="bg-[#28170F] border-[#8C6F4E]/40 text-[#F5E3C2]"
              />
              <p className="text-xs text-[#8C6F4E]">Aspoň 8 znakov, písmená aj číslice.</p>
            </div>
            <div className="space-y-2">
              <Label>Rola</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as AdminRole })}>
                <SelectTrigger className="bg-[#28170F] border-[#8C6F4E]/40 text-[#F5E3C2]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#3a251a] border-[#8C6F4E]/40 text-[#F5E3C2]">
                  {assignableRoles.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              className="border-[#8C6F4E]/50 text-[#F5E3C2] hover:bg-[#8C6F4E]/20"
            >
              Zrušiť
            </Button>
            <Button onClick={handleCreate} disabled={busy} className="bg-[#E09E14] hover:bg-[#c88a10] text-[#28170F]">
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Vytvoriť
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent className="bg-[#3a251a] border-[#8C6F4E]/40 text-[#F5E3C2]">
          <DialogHeader>
            <DialogTitle className="text-[#F5E3C2]">Upraviť používateľa</DialogTitle>
            <DialogDescription className="text-[#8C6F4E]">{editUser?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="e-name">Meno</Label>
              <Input
                id="e-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="bg-[#28170F] border-[#8C6F4E]/40 text-[#F5E3C2]"
              />
            </div>
            <div className="space-y-2">
              <Label>Rola</Label>
              <Select
                value={editForm.role}
                onValueChange={(v) => setEditForm({ ...editForm, role: v as AdminRole })}
                disabled={editUser?.id === currentUser.id}
              >
                <SelectTrigger className="bg-[#28170F] border-[#8C6F4E]/40 text-[#F5E3C2]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#3a251a] border-[#8C6F4E]/40 text-[#F5E3C2]">
                  {assignableRoles.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editUser?.id === currentUser.id && (
                <p className="text-xs text-[#8C6F4E]">Vlastnú rolu nie je možné zmeniť.</p>
              )}
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditUser(null)}
              className="border-[#8C6F4E]/50 text-[#F5E3C2] hover:bg-[#8C6F4E]/20"
            >
              Zrušiť
            </Button>
            <Button onClick={handleEdit} disabled={busy} className="bg-[#E09E14] hover:bg-[#c88a10] text-[#28170F]">
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Uložiť
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password dialog */}
      <Dialog open={!!pwUser} onOpenChange={(o) => !o && setPwUser(null)}>
        <DialogContent className="bg-[#3a251a] border-[#8C6F4E]/40 text-[#F5E3C2]">
          <DialogHeader>
            <DialogTitle className="text-[#F5E3C2]">Zmeniť heslo</DialogTitle>
            <DialogDescription className="text-[#8C6F4E]">{pwUser?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="p-password">Nové heslo</Label>
              <Input
                id="p-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-[#28170F] border-[#8C6F4E]/40 text-[#F5E3C2]"
              />
              <p className="text-xs text-[#8C6F4E]">Aspoň 8 znakov, písmená aj číslice. Aktívne relácie sa odhlásia.</p>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPwUser(null)}
              className="border-[#8C6F4E]/50 text-[#F5E3C2] hover:bg-[#8C6F4E]/20"
            >
              Zrušiť
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={busy}
              className="bg-[#E09E14] hover:bg-[#c88a10] text-[#28170F]"
            >
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Zmeniť heslo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-[#3a251a] border-[#8C6F4E]/40 text-[#F5E3C2]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#F5E3C2]">Odstrániť používateľa?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#8C6F4E]">
              Týmto natrvalo odstránite účet {deleteTarget?.email}. Túto akciu nie je možné vrátiť späť.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#8C6F4E]/50 bg-transparent text-[#F5E3C2] hover:bg-[#8C6F4E]/20">
              Zrušiť
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              disabled={busy}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Odstrániť
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
