/** 
  * A prototype to search and filter Excercises in the eduZEN Excercise-Archive.
  *
  *
 **/

var dmc = new RESTClient("http://localhost:8080/core")
var dict = new eduzenDictionary("DE")

var filterView = new function () {

  this.historyApiSupported = window.history.pushState

  this.e_objects = {}
  this.e_collection = new Array()
  this.results = undefined

  /** filterViews application controler **/

  this.initSearchView = function () { 

    // registering handler
    $("[name=search]").submit(filterView.doSearch)
    window.addEventListener("popstate", function(e) {
      if (e.state) filterView.pop_history(e.state)
    })
    // handling deep links
    var entryUrl = window.location.href
    var commandingUrl = entryUrl.substr(entryUrl.indexOf("#") + 1)
    var commands = commandingUrl.split("?")

    if (commands[0] === "dosearch") {
      var value = commands[1].substr(commands[1].indexOf("=") + 1)
      $("[name=searchfield]").val("" + value + "")
      filterView.doSearch(value)
    } else if (commands[0] === "doshow") {
      var exId = parseInt(commands[1].substr(commands[1].indexOf("=") + 1))
      filterView.showResultItem(undefined, exId)
    }
  }

  /** Controler for the search functionality **/

  this.doSearch = function (searchFor) {
    var searchValue = ""
    if (searchFor != undefined) {
      searchValue = searchFor
    } else {
      var searchInput = $("[name=searchfield]").val()
      searchValue = searchInput
    }
    if (searchValue === "" || typeof(searchValue) == "object" || !(/\S/.test(searchValue))) return
    
    var resultCount = 0
    try {
      var excercise_names = dmc.search_topics(null, searchValue, "tub.eduzen.excercise_name", false)
      resultCount += excercise_names.length
    } catch (err) { console.log("cathing name search error.. ") }
    try {
      var excercise_descs = dmc.search_topics(null, searchValue, "tub.eduzen.excercise_description", false)
      resultCount += excercise_descs.length
    } catch (err) { console.log("cathing description search error.. ") }
    var existing_enames = dmc.get_topics("tub.eduzen.excercise_name", false) // fixme: just to GET a count
    // var excercise_objects = dmc.search_topics(null, searchValue, "tub.eduzen.excercise_object", false)

    var resultObject = {
      size: resultCount, overallCount: existing_enames.items.length, searchFor: searchValue
    }
    // fixme: build up query object, too

    // updating gui after a query
    filterView.showResultHeader(resultObject)
    filterView.results = excercise_names.concat(excercise_descs)
    filterView.showResults()

    filterView.push_history({"action": "dosearch", "parameter": resultObject}, "#dosearch?for=" + searchValue)
  }

  this.showResultHeader = function (rO) {
    if (rO.size == 0) {
      $("#result-count").html("Ihre Anfrage nach \"" + rO.searchFor + "\" lieferte keine Ergebnisse.")
      filterView.emptyResultList()
      return
    }
    $("#result-count").html("Ihre Anfrage nach \"" + rO.searchFor + "\" lieferte <b>"
      + rO.size + "</b> von " + rO.overallCount + " insg. Aufgabenstellungen")
  }

  /** 
   *  Controlling for displaying and querying a complete list of search results ..
   *  including many async queries _for each_ result item (to fetch excercise_texts, topicalareas and sample solutions)
   **/

  this.showResults = function () {
    filterView.emptyResultList()

    for (i=0; i < filterView.results.length; i++) { // for each result item
      var result = filterView.results[i]
      var moreOutput = "<li id=\"" + result.id + "\" class=\"result-item\">"
        + "<a class=\"item-handler\">" + result.value + "</a>"
      var hasSampleSolution = false
      var excerciseText = { items: new Array(), total_count: 1}
      if (result.type_uri === "tub.eduzen.excercise_text") {
        excerciseText.items.push(result)
      } else {
        excerciseText = dmc.get_related_topics(result.id, {"others_topic_type_uri": "tub.eduzen.excercise_text"})
      }

      if (excerciseText.items[0] != undefined) { // fixme: there should always be just one, so we`re taking the 1st
        exId = excerciseText.items[0].id
        // to get all taken excercises for this specific eText
        var excercises = dmc.get_related_topics(exId, {"others_topic_type_uri": "tub.eduzen.excercise"})
        if (excercises.total_count > 0) { //
          // console.log(excercises.items.length + " times taken " + excerciseText.items[0].value + " excercise")
          for (taken in excercises.items) { // get all approaches submitted to this excercise
            var excerciseId = excercises.items[taken].id
            var approaches = dmc.get_related_topics(excerciseId, {"others_topic_type_uri": "tub.eduzen.approach"})
            if (approaches.total_count > 0) { // find sample solutions..
              for (a in approaches.items) { // get all approaches marked as sample solution
                var approach = approaches.items[a]
                approach = dmc.get_topic_by_id(approach.id, true)
                if (approach.composite["tub.eduzen.approach_sample"].value) hasSampleSolution = true
              }
            } else {
              // console.log("no approaches submitted for eText " + excerciseText.items[0].value)
            }
          }
        } else {
          // console.log("no excercise taken for eText " + excerciseText.items[0].value)
        }
        // console.log("hasSampleSolution => " + hasSampleSolution)
        moreOutput += "<span class=\"sample-solution " + hasSampleSolution + "\">" + hasSampleSolution + "</span>"
          + "<span class=\"more-info\">ist <i>" + dict.typeName(result.type_uri) + "</i>"

        var topicalareas = dmc.get_related_topics(exId, {"others_topic_type_uri": "tub.eduzen.topicalarea"})
        if (topicalareas.total_count > 0) {
          moreOutput += "&nbsp;und ist verbunden mit dem/den <i class=\"label\">Themenkomplex(en):</i>"
          for (topic in topicalareas.items) {
            var topicalarea = topicalareas.items[topic]
            moreOutput += "<span class=\"associations\"><a class=\"topicalarea\" id=\"" + topicalarea.id
              + "\" href=\"javascript:filterView.clickTopicalArea(" + topicalarea.id + ")\">"
              + topicalarea.value +"</a></span>"
          }
        }
      }
      moreOutput += "</span></li>"
      $("#result-list").append(moreOutput)
    }

    $("a.item-handler", "#result-list").click(filterView.showResultItem);
  }

  this.emptyResultList = function () {
    $("#result-list").empty()
  }
  
  this.hideExcerciseView = function () {
    $(".excercise-view").hide()
  }

  /** Controlling display of a specific excercise by given id or given DOM-target **/

  this.showResultItem = function (e, id) {
    // this handler is currently also registered for excercise_objects..
    var exId = ""
    var targetId = undefined
    var result = undefined
    if (e != undefined) { // manually clicked
      targetId = parseInt(e.target.parentElement.id)
      result = dmc.get_topic_by_id(targetId)
      var excerciseTopic = { items: new Array(), total_count: 1}
      if (result.type_uri === "tub.eduzen.excercise_text") {
        excerciseTopic.items.push(result)
      } else {
        excerciseTopic = dmc.get_related_topics(result.id, {"others_topic_type_uri": "tub.eduzen.excercise_text"})
      }
      if (excerciseTopic.items[0] != undefined) {
        exId = excerciseTopic.items[0].id
      } else {
        console.log("ERROR: cannot find related excercise_text for nodeId => " + targetId)
        exId = undefined
      }
    } else { // programmatically called showResultItem, yet unused
      exId = id
    }
    filterView.showExcercise(exId, targetId)
    filterView.push_history({"action": "doshow", "parameter": exId}, "#doshow?id=" + exId)
  }

  this.showExcercise = function (eId, tId) {
    var parentRenderer = "#"
    var excercise = dmc.get_topic_by_id(eId)
    var nameOfExcercise = excercise.composite['tub.eduzen.excercise_name'].value
    var descriptionOfExcercise = excercise.composite['tub.eduzen.excercise_description'].value

    if (tId == undefined) { // programmatically called, to show some result-list
      filterView.results = [excercise]
      filterView.showResults()
      // excerciseId is resultItemList.targetId
      // no recursive call making sure tId != undefined
      filterView.showExcercise(excercise.id, excercise.id) // simulate manual selection of resultItem
      $(parentRenderer + " .excercise-view").show()
      return
    } else {
      parentRenderer = parentRenderer + "" + tId // manually clicked, go on and toggle excercise in resultList
    }

    if ($(parentRenderer + " .excercise-view").length > 0) {
      // if excercise view was already loaded, just show it
      $(parentRenderer + " .excercise-view").toggle()
      return
    } else {
      $(parentRenderer + " .excercise-view").show()
    }

    var viewOutput = "<div class=\"excercise-view\" id=\"" + eId + "\">"
      viewOutput += "<span class=\"label\">Aufgabenstellung</span><br/>"
      // viewOutput += "<span class=\"name\"><a href=\"#doshow?id=" + excercise.id + "\" id=\""
        // + excercise.id + "\" >" + nameOfExcercise + "</a></span>"
      viewOutput += "<span class=\"description\">" + descriptionOfExcercise + "</span>"

      /** var pasteValue = nameOfExcercise + descriptionOfExcercise
      $("#page").append("<a href=\"javascript:filterView.copyToClipboard("
        + pasteValue + ")\">copy + paste excercise</a>") */

      var excerciseObjects = dmc.get_related_topics(eId, {"assoc_type_uri": "tub.eduzen.compatible",
        "others_topic_type_uri": "tub.eduzen.excercise_object"})
      if (excerciseObjects.total_count > 0) {
        viewOutput += "<br/><span class=\"label\">Dazu kompatible Aufgabenobjekte:</span><br/>"

        var objectString = "<ul class=\"objects\">"
        for (object in excerciseObjects.items) {
          var excerciseObject = excerciseObjects.items[object]
          objectString += "<li id=\"" + excerciseObject.id + "\""
            + "onclick=\"javascript:filterView.toggleExcerciseObject(" + excerciseObject.id
            + ", " + eId + ")\"><a class=\"excercise-object\">" + excerciseObject.value +"</a></li>"
        }
        objectString += "</ul>"
        viewOutput += objectString
        viewOutput += "<div class=\"add-excercise button disabled " + eId + "\"><a>Aufgabe ausw&auml;hlen"
          + "</a></div><div class=\"add-excercise-object label hint\">"
          + "Hinweis: Um diese Aufgabe Ihrem &Uuml;bungszettel hinzuf&uuml;gen zu k&ouml;nnen,"
          + "w&auml;hlen Sie bitte mind. 1 dazu kompatibles <i class=\"excercise-object\">Aufgabenobjekt</i>"
          + "aus.</div>"
      } else {
        viewOutput += "<div class=\"add-excercise button " + eId
          + "\" onclick=\"javascript:filterView.selectExcercise(" + eId + ")\">"
          + "<a>Aufgabe ausw&auml;hlen</a></div>"
      }
      viewOutput += "</div>"
    $(parentRenderer).append(viewOutput)
    $(parentRenderer).show()
  }
  
  this.clickTopicalArea = function (topicalId) {
    var excerciseTexts = filterView.get_excercises_by_topicalarea(topicalId)
    filterView.results = excerciseTexts
    filterView.showResults()
  }

  /** Controlling a collection of excercises **/

  this.selectExcercise = function (eId) {
    console.log("adding excercise " + eId + " to practice sheet ...")
    filterView.addExcerciseToCollection(eId)
    console.log(filterView.e_collection)
  }

  this.addExcerciseToCollection = function (id) {
    // in development, not yet working
    if(typeof(id) == "object") {
      id = parseInt(id.delegateTarget.parentElement.id)
    }
    filterView.e_collection.push(id)
    console.log(filterView.e_collection)
  }

  /** Controlling one/many related excercise_objects for each listed excercise **/

  this.toggleExcerciseObject = function (objectId, eId) {
    if (filterView.e_objects[eId] != undefined) {
      for (i=0; i < filterView.e_objects[eId].length; i++) {
        excercise_object = filterView.e_objects[eId][i]
        if (excercise_object == objectId) {
          // remove excercise object again..
          filterView.removeObjectFromExcercise(objectId, eId)
          $("li#" + objectId + "").removeClass("selected")
          filterView.toggleRenderingForExcercise(objectId, eId)
          return
        }
      }
    }
    // model
    filterView.addObjectToExcercise(objectId, eId)
    // view
    $("li#" + objectId + "").addClass("selected")
    filterView.toggleRenderingForExcercise(objectId, eId)
  }

  this.toggleRenderingForExcercise = function (objectId, eId) {
    if (filterView.e_objects[eId].length > 0) {
      $(".add-excercise.button."+ eId).removeClass("disabled")
      $(".add-excercise.button."+ eId).unbind("click")
      $(".add-excercise.button."+ eId).click(filterView.addExcerciseToCollection)
    } else {
      $(".add-excercise.button."+ eId).addClass("disabled")
      $(".add-excercise.button."+ eId).unbind("click")
    }
  }

  this.addObjectToExcercise = function (object, excercise) {
    if (filterView.e_objects[excercise] != undefined) {
      filterView.e_objects[excercise].push(object)
    } else {
      filterView.e_objects[excercise] = [object]
    }
  }

  this.removeObjectFromExcercise = function (object, excercise) {
    if (filterView.e_objects[excercise] != undefined) {
      for (i=0; i < filterView.e_objects[excercise].length; i++) {
        excercise_object = filterView.e_objects[excercise][i]
        if (excercise_object == object) {
          filterView.e_objects[excercise].splice(i, 1)
          return
        }
      }
    }
  }

  /** More general methods **/

  this.copyToClipboard = function (text) {
    window.prompt ("Copy to clipboard: STRG+C, Enter", text)
  }

  this.pop_history = function (state) {
    if (!filterView.historyApiSupported) return
    console.log("popping_")
    console.log(state)
    if (state.action == "dosearch") {
      var searchValue = state.parameter.searchFor
      $("[name=searchfield]").val("" + searchValue + "")
      filterView.doSearch(searchValue)
    } else if (state.action == "doshow") {
      var exId = state.parameter
      filterView.showResultItem(undefined, exId)
    }
  }

  this.push_history = function (state, link) {
    if (!filterView.historyApiSupported) return
    console.log("pushing_")
    console.log(state)
    var history_entry = {state: state, url: link}
    window.history.pushState(history_entry.state, null, history_entry.url)
  }

  /** The FilterViews RESTClient-methods **/

  this.get_excercises_by_topicalarea = function(id) {
    return dmc.request("GET", "/eduzen/excercise/by_topicalarea/" + id, undefined, undefined, undefined, false)
  }

  this.login = function(authorization) {

    var DEFAULT_USER = "admin"
    var DEFAULT_PASSWORD = ""
    var ENCRYPTED_PASSWORD_PREFIX = "-SHA256-" // don't change this
    var pwd = ENCRYPTED_PASSWORD_PREFIX + SHA256(DEFAULT_PASSWORD)
    var credentials = "admin:" + pwd

    return dmc.request("POST", "/accesscontrol/login", undefined, {"Authorization": "Basic "+ btoa(credentials)})
  }

  this.logout = function() {

    return dmc.request("POST", "/accesscontrol/logout", undefined, undefined)
  }

}

$(window).load(filterView.initSearchView)
