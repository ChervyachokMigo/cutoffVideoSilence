@echo off

set Var1=%1
set VarPath="C:\Program Files\nodejs\!node_projects\audiostream\index.js"

if not defined Var1 (echo Nothing to do) else (node %VarPath% %1)

pause