echo off

echo arg1: %1

set USR_INPUT_STR=
set USR_INPUT_DBREAD=

set /P USR_INPUT_STR="�摜�EPDF�t�@�C���̃_�E�����[�h���J�n���܂���(Y/N): "


if "%USR_INPUT_STR%" neq "Y" (
	
	echo �W���u�I��
	set /P USR_INPUT_STR=
	exit

)

set /P USR_INPUT_DBREAD="DB�̐V�K���i���_�E�����[�h���܂�(Y/N): "

if "%USR_INPUT_DBREAD%" == "Y" (

	echo DB�`�F�b�N���������Ń_�E�����[�h�J�n���܂�

	rem call
	call node C:\web-crawler\download.js Y

	set /P USR_INPUT_STR="�_�E�����[�h�I�����܂� "

) else (

	echo �ݒ�t�@�C���݂̂Ń_�E�����[�h���܂�

	rem call
	call node C:\web-crawler\download.js N
	
	set /P USR_INPUT_STR="�_�E�����[�h�I�����܂� "

)


