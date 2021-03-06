function BimServerCesiumLoader() {
	var o = this;

	function loadScripts(urls, callback)
	{
		var toload = urls.length;
	    // Adding the script tag to the head as suggested before
	    var head = document.getElementsByTagName('head')[0];
	    urls.forEach(function(url){
		    var script = document.createElement('script');
		    script.type = 'text/javascript';
		    script.src = url;

		    // Then bind the event to the callback function.
		    // There are several events for cross browser compatibility.
		     
		    var cb = function(){
		    	console.log("loaded", url);
		    	toload--;
		    	if (toload == 0) {
		    		callback();
		    	}
		    };
		     
//		    script.onreadystatechange = cb;
		    script.onload = cb;

		    // Fire the loading
		    head.appendChild(script);
	    });
	}

	this.init = function(bimServerAddress, username, password, callback){
		console.log("loading script");
		
		var scripts = [
		    bimServerAddress + "/apps/bimserverjavascriptapi/bimserverapiwebsocket.js",
		    bimServerAddress + "/apps/bimserverjavascriptapi/bimserverapipromise.js",
		    bimServerAddress + "/apps/bimserverjavascriptapi/geometry.js",
		    bimServerAddress + "/apps/bimserverjavascriptapi/ifc2x3tc1.js",
		    bimServerAddress + "/apps/bimserverjavascriptapi/ifc4.js",
		    bimServerAddress + "/apps/bimserverjavascriptapi/model.js",
		    bimServerAddress + "/apps/bimserverjavascriptapi/translations_en.js",
		    bimServerAddress + "/apps/bimserverjavascriptapi/bimserverclient.js" 
		];
		loadScripts(scripts, function () {
			console.log("creating client");
			
			var notifier = {
				setInfo: function(message, timeout){
					console.log("[default]", message);
				},
				setSuccess: function(message, timeout){},
				setError: function(error){
					console.error(error);
				},
				resetStatus: function(){},
				resetStatusQuick: function(){},
				clear: function(){}
			};
			
			o.bimServerApi = new BimServerClient(bimServerAddress, notifier);
			console.log("initializing client");
			o.bimServerApi.init(function(api, serverInfo){
				console.log(serverInfo);
				if (serverInfo.serverState == "RUNNING") {
					console.log("logging in");
					o.bimServerApi.login(username, password, function(){
						if (callback != null) {
							callback();
						}
					});
				}
			});
		});
	};
	
	this.getJson = function(address, success, error){
		var xhr = new XMLHttpRequest();
		xhr.open("GET", address);
		xhr.setRequestHeader("Content-Type", "application/json; charset=UTF-8");
		xhr.onload = function(jqXHR, textStatus, errorThrown) {
		    if (xhr.status === 200) {
		    	try {
		    		var data = JSON.parse(xhr.responseText);
		    	} catch (e) {
		    		if (e instanceof SyntaxError) {
		    			if (error != null) {
		    				error(e);
		    			} else {
		    				console.error(e);
		    			}
		    		} else {
		    			console.error(e);
		    		}
		    	}
	    		success(data);
		    } else {
		    	if (error != null) {
		    		error(jqXHR, textStatus, errorThrown);
		    	} else {
		    		console.error(jqXHR, textStatus, errorThrown);
		    	}
		    }
		};
		xhr.send();
	};

	this.loadGltf = function(roid, query, callback){
		o.bimServerApi.getSerializerByPluginClassName("org.bimserver.gltf.BinaryGltfSerializerPlugin", function(serializer){
			o.bimServerApi.call("ServiceInterface", "download", {
				roids: [roid],
				query: JSON.stringify(query),
				serializerOid: serializer.oid,
				sync: false
			}, function(topicId){
				o.bimServerApi.registerProgressHandler(topicId, function(topicId, state){
					if (state.title == "Done preparing") {
						var url = o.bimServerApi.generateRevisionDownloadUrl({serializerOid: serializer.oid, topicId: topicId});
						console.log(url);
						callback(url);
					}
				});
			});
		});		
	}
	
	this.loadGltfTypes = function(roid, type, callback){
		o.bimServerApi.getSerializerByPluginClassName("org.bimserver.gltf.BinaryGltfSerializerPlugin", function(serializer){
			o.bimServerApi.call("ServiceInterface", "download", {
				roids: [roid],
				schema: "ifc2x3tc1",
				serializerOid: serializer.oid,
				sync: false
			}, function(topicId){
				o.bimServerApi.registerProgressHandler(topicId, function(topicId, state){
					if (state.title == "Done preparing") {
						var url = o.bimServerApi.generateRevisionDownloadUrl({serializerOid: serializer.oid, topicId: topicId});
						callback(url);
						//o.bimServerApi.call("ServiceInterface", "cleanupLongAction", {topicId: topicId}, function(){});
					}
				});
			});
		});		
	};

	this.loadTypes = function(roid, type, callback){
		var query = {
			type: type,
			include: {
				type: type,
				field: "geometry",
				include: {
					type: "GeometryInfo",
					field: "data"
				}
			}
		};
		o.bimServerApi.getSerializerByPluginClassName("org.bimserver.cesium.BoundingBoxesJsonSerializerPlugin", function(serializer){
			console.log(serializer);
			o.bimServerApi.call("ServiceInterface", "download", {
				roids: [roid],
				query: JSON.stringify(query),
				serializerOid: serializer.oid,
				sync: false
			}, function(topicId){
				o.bimServerApi.registerProgressHandler(topicId, function(topicId, state){
					console.log(state);
					if (state.title == "Done preparing") {
						var url = o.bimServerApi.generateRevisionDownloadUrl({serializerOid: serializer.oid, topicId: topicId});
						console.log(url);
						o.getJson(url, function(data){
							data.forEach(callback);
						});
					}
				});
			});
		});
	};
}