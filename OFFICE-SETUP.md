# Running the tracker on the office computer

## Every day: start the app

1. Open PowerShell.
2. Run `cd $HOME\gheeaudittracker`
3. Run `npm start`
4. Wait for `✓ Ready`, then leave the window open. Closing it stops the app.

## Logging in

- **On the office computer:** http://localhost:3000/login
- **On staff computers (office Wi-Fi):** http://192.168.0.135:3000/login

Log in with the master admin email and the password you set (12 or more characters).
If it says the email or password is wrong, run the `create-master-admin` account script.
If that says the account "already exists", run the reset script instead.

## If staff see "refused to connect"

Windows Firewall is blocking them. While you're on the office Wi-Fi, open PowerShell
**as Administrator** on the office computer and run:

```
New-NetFirewallRule -DisplayName "Ghee Audit Tracker" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -Profile Private,Domain
Get-NetConnectionProfile | Set-NetConnectionProfile -NetworkCategory Private
```

Then ask staff to try again. You only need to do this once.

If the office computer's address ever changes from `192.168.0.135`, run `ipconfig`
and use the new "IPv4 Address" in the staff link.

## Harmless warning

A warning about an extra `package-lock.json` doesn't break anything. To remove it,
run this once: `del C:\Users\OWNER\package-lock.json`
