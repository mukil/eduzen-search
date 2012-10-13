function eduzenDictionary(lang) {

  this.typeName = function (type_uri) {
    if (lang === "DE") {
      typeNames = {
        "tub.eduzen.excercise_text": "Aufgabenstellung",
        "tub.eduzen.excercise_name": "Name der Aufgabe",
        "tub.eduzen.excercise_description": "Aufgabentext",
        "tub.eduzen.excercise_object": "Aufgabenobjekt",
        "tub.eduzen.topicalarea": "Themenkomplex"
      }
    }
    return typeNames[type_uri];
  }

  this.stateName = function (uri) {
    if (lang === "DE") {
      stateNames = {
        "tub.eduzen.awaiting_comment": "Wartend auf Kommentar",
        "tub.eduzen.solved": "Gel&ouml;st",
        "tub.eduzen.unsolved": "Ungel&ouml;st",
        "tub.eduzen.in_progress": "in Bearbeitung",
        "tub.eduzen.untouched": "Ohne L&ouml;sungsversuch",
        "tub.eduzen.undecided": "Unentschieden",
        "tub.eduzen.correct": "Korrekt",
        "tub.eduzen.wrong": "Falsch",
        "false": "Falsch",
        "true": "Korrekt"    
      }
    }
    return stateNames[uri];
  }
}

