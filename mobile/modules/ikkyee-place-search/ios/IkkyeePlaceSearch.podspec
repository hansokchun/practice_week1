Pod::Spec.new do |s|
  s.name           = 'IkkyeePlaceSearch'
  s.version        = '0.1.0'
  s.summary        = 'Restricted native Google Places text search for Ikkyee.'
  s.description    = 'Provides a minimal place name, address, and coordinate projection without exposing a REST key to JavaScript.'
  s.license        = { :type => 'MIT' }
  s.author         = 'Ikkyee'
  s.homepage       = 'https://ikkyee.com'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { :git => 'https://ikkyee.com/ikkyee-place-search.git', :tag => s.version.to_s }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.dependency 'GooglePlaces', '9.4.0'
  s.source_files = '**/*.{h,m,mm,swift,hpp,cpp}'
end
