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
}

