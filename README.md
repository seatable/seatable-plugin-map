# seatable-plugin-map
Map plugin for SeaTable

## map 插件使用说明
> 插件开发基本配置参见：[dtable-plugin-template 插件开发说明文档](https://github.com/seatable/seatable-plugin-template)

### colne 项目到本地
`git@github.com:seatable/seatable-plugin-map.git`

### 安装依赖项
 执行 `npm install`

### 添加谷歌地图开发密钥

在settings 配置文件中添加谷歌地图授权的开发密钥(ak) 详细步骤参见：[账号与密钥获取](https://cloud.google.com/maps-platform/)，在settings 文件添加如下配置

```
window.dtable = window.dtable ? window.dtable : {};
window.dtable['dtableGoogleMapKey'] = '**';
```

**注：** window.dtable['dtableGoogleMapKey'], 为你申请的密钥（ak）值

### 本地运行测试

执行 `npm start`, 可以在浏览器中看到显示的地图

### 集成测试

执行 `npm run build-plugin`, 上传到使用该插件的dtable中，点击插件，可在界面中看到显示的地图

### 开发

依据需求，更新插件，完成功能
