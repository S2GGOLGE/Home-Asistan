-- 1. Create Roles Table
CREATE TABLE Roles (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(50) NOT NULL UNIQUE
);

-- 2. Insert Default Roles
INSERT INTO Roles (Name) VALUES ('Admin'), ('Uye'), ('Misafir');

-- 3. Add RoleId column to Users table and set default to 'Uye' (Member)
-- Note: If you already have Users table, run this:
ALTER TABLE Users ADD RoleId INT NULL;
ALTER TABLE Users ADD CONSTRAINT FK_Users_Roles FOREIGN KEY (RoleId) REFERENCES Roles(Id);

-- Set default role to 'Uye' for existing users
UPDATE Users SET RoleId = (SELECT Id FROM Roles WHERE Name = 'Uye') WHERE RoleId IS NULL;
