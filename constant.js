//login info
exports.user_info = {
	username: "fuyuno-s@fasic.co.jp",
	password : "Fuyuno0824"
}

const path = 'C:\\web-crawler\\';

exports.path = path;

//env info
exports.eichholtz_envConf = {
	log_name  : path + 'log.txt',
	list_item_query : 'div.product-item-info',
	nedb_file_name : path + 'list-items.nedb',
	nedb_file_name_tmp : path + 'list-items_tmp.nedb',
	env_time : path + 'env_time.txt',
}

exports.loginURL = 'https://www.eichholtz.com/en/customer/account/login/'

exports.downloadInfo = {
	itemList :  path + '\\downloadList.csv',
	dir_name :  path + 'download\\',
	pdfDownloadURL : 'https://www.eichholtz.com/en/eichholtz_catalog/itemspecificationsheet/get/id/',
	pdf_name : 'specificationsheet',
	img_name : 'img',
	time : 10, // 秒
}