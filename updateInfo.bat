echo off
rem ������

echo arg1: %1

rem ����o�b�`���`�F�b�N

set USR_INPUT_STR=

if "TRUE" == "%1"  (
	rem ����W���u
	
	rem call
	call node C:\web-crawler3\check_update.js 1
	rem call node C:\Users\fuyun\web-crawler\check_update.js 1
			
) else (
	
	rem �p�����[�^����
	set /P USR_INPUT_STR="�`�F�b�N�J�n���܂���(Y/N): "

)

if "%USR_INPUT_STR%" == "Y" (
	echo �����o�b�`�̊J�n

	rem call
	call node C:\web-crawler3\check_update.js 2
	rem call node C:\Users\fuyun\web-crawler\check_update.js 2

	rem �p�����[�^����
	set /P USR_INPUT_STR="�I�����܂��iOK?�j: "

) else (
	echo �o�b�`�I��
)

rem FORFILES /P C:\web-crawler3\upload /D -7 /C "cmd /c del /s /q @file"
FORFILES /P C:\Users\fuyun\web-crawler\upload /D -7 /C "cmd /c del /s /q @file"
