$connString = "Data Source=Emree;Initial Catalog=Home;Integrated Security=True;Encrypt=False"
try {
    $conn = New-Object System.Data.SqlClient.SqlConnection($connString)
    $conn.Open()
    
    # 1. Get Tables
    Write-Host "=== VERİTABANI TABLOLARI ===" -ForegroundColor Green
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'"
    $reader = $cmd.ExecuteReader()
    $tables = @()
    while ($reader.Read()) {
        $tables += $reader["TABLE_NAME"]
    }
    $reader.Close()
    
    # 2. Devices Table
    if ($tables -contains "Devices") {
        Write-Host "`n=== DEVICES (CİHAZLAR) TABLOSU ===" -ForegroundColor Green
        $cmd.CommandText = "SELECT * FROM Devices"
        $reader = $cmd.ExecuteReader()
        while ($reader.Read()) {
            $id = $reader["Id"]
            $name = $reader["Name"]
            $type = $reader["Type"]
            $status = $reader["Status"]
            Write-Host "ID: $id | İsim: $name | Tip: $type | Durum/Online: $status"
        }
        $reader.Close()
    }

    # 3. Users Table
    if ($tables -contains "Users") {
        Write-Host "`n=== USERS (KULLANICILAR) TABLOSU ===" -ForegroundColor Green
        $cmd.CommandText = "SELECT * FROM Users"
        $reader = $cmd.ExecuteReader()
        $hasUsers = $false
        while ($reader.Read()) {
            $hasUsers = $true
            # Let's see what columns are in Users. Let's try standard ones or catch error
            try {
                $id = $reader["Id"]
                $username = $reader["Username"]
                $role = $reader["Role"]
                Write-Host "ID: $id | Kullanıcı: $username | Rol: $role"
            } catch {
                # If columns are different, print all column names and values
                $cols = for ($i=0; $i -lt $reader.FieldCount; $i++) { $reader.GetName($i) }
                $vals = @()
                for ($i=0; $i -lt $reader.FieldCount; $i++) { $vals += "$($reader.GetName($i)): $($reader.GetValue($i))" }
                Write-Host ($vals -join " | ")
            }
        }
        if (-not $hasUsers) {
            Write-Host "Kullanıcı tablosu boş."
        }
        $reader.Close()
    }

    # 4. Commands Table
    if ($tables -contains "Commands") {
        Write-Host "`n=== COMMANDS (KOMUTLAR) TABLOSU ===" -ForegroundColor Green
        $cmd.CommandText = "SELECT TOP 10 * FROM Commands ORDER BY Id DESC"
        $reader = $cmd.ExecuteReader()
        $hasCmds = $false
        while ($reader.Read()) {
            $hasCmds = $true
            try {
                $id = $reader["Id"]
                $cmdText = $reader["CommandText"]
                $intent = $reader["Intent"]
                $status = $reader["Status"]
                Write-Host "ID: $id | Komut: $cmdText | Intent: $intent | Durum: $status"
            } catch {
                $vals = @()
                for ($i=0; $i -lt $reader.FieldCount; $i++) { $vals += "$($reader.GetName($i)): $($reader.GetValue($i))" }
                Write-Host ($vals -join " | ")
            }
        }
        if (-not $hasCmds) {
            Write-Host "Komut tablosu boş."
        }
        $reader.Close()
    }
    
    # 5. Logs Table
    if ($tables -contains "Logs") {
        Write-Host "`n=== SON 5 SİSTEM LOGU ===" -ForegroundColor Green
        $cmd.CommandText = "SELECT TOP 5 * FROM Logs ORDER BY Id DESC"
        $reader = $cmd.ExecuteReader()
        while ($reader.Read()) {
            $id = $reader["Id"]
            $level = $reader["LogLevel"]
            $msg = $reader["Message"]
            $source = $reader["Source"]
            Write-Host "[$level] ($source): $msg"
        }
        $reader.Close()
    }
    
    $conn.Close()
} catch {
    Write-Error "Hata: $_"
}
