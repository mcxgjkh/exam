@echo off
SET JSFOLDER=js
chdir /d %JSFOLDER%
for /r . %%a in (*.js) do (
    uglifyjs %%~fa  -m -o %%~fa
)
echo Complete.
pause & exit