echo off
rem ������

echo arg1: %1

rem ����o�b�`���`�F�b�N

set USR_INPUT_STR=

if "TRUE" == "%1"  (
	rem ����W���u
	
	rem call
	call node C:\web-crawler\update.js 1
		
	set aaa ="aaa?"
	
) else (
	
	rem �p�����[�^����
	set /P USR_INPUT_STR="�`�F�b�N�J�n���܂���(Y/N): "

)

if "%USR_INPUT_STR%" == "Y" (
	echo �����o�b�`�̊J�n

	rem call
	call node C:\web-crawler\update.js 2

	rem �p�����[�^����
	set /P USR_INPUT_STR="�I�����܂��iOK?�j: "

) else (
	echo �o�b�`�I��
)

