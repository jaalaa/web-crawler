//login info
exports.corec_user_info = {
	username: "fuyuno-s@fasic.co.jp",
	password : "fuyuno0824"
}

//login info
exports.user_info = {
	username: "fuyuno-s@fasic.co.jp",
	password : "Fasic1234"
}

const path = 'C:\\web-crawler\\';
//const path = 'C:\\Users\\fuyun\\web-crawler\\';

exports.path = path;

//env info
exports.eichholtz_envConf = {
	log_name  : path + 'log.txt',
	log_name_update  : path + 'update_log.txt',
	list_item_query : 'div.product-item-info',
	nedb_file_name : path + 'list-items.nedb',
	nedb_file_name_tmp : path + 'tmp.nedb',
	env_time : path + 'env_time.txt',
}

exports.loginURL = 'https://www.eichholtz.com/en/customer/account/login/'
exports.collection = 'https://www.eichholtz.com/en/collection.html'
exports.collectionMulti = 'https://www.eichholtz.com/en/collection.html?p='

exports.downloadInfo = {
	targetPath :  path + 'output\\',
	itemList :  path + '\\downloadList.csv',
	dir_name :  path + 'download\\',
	pdfDownloadURL : 'https://www.eichholtz.com/en/eichholtz_catalog/itemspecificationsheet/get/id/',
	pdf_name : '',
	img_name : '',
	time : 5, // 秒
}

exports.date = path + 'output\\date.txt';
exports.log = path + 'output\\log.txt';
