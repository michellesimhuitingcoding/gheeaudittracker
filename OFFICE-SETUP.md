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

## Forgot password

Staff click **Forgot password?** on the login page and enter their email. This asks
the Master Admin for help: a red number appears on the Master Admin's bell, and the
request is listed under **Notifications → Action Required**.

To help them, the Master Admin clicks the request (it opens that person's staff page),
sets a **temporary password** under "Password", and tells the staff member. When they
log in with it, they must choose their own password before they can use the app.

Anyone can change their own password any time with **Change password** on the home page.

## If a Master Admin is locked out

Any Master Admin can reset another Master Admin's password on the Staff page. If no
Master Admin can log in, run this on the office computer (with your Master Admin email):

```
cd $HOME\gheeaudittracker
npm run reset-master-admin-password -- your-email@example.com
```

It prints a temporary password **once**. Log in with it and you'll be asked to choose
your own password straight away. It only works for active Master Admins.

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
